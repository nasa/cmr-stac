#!/usr/bin/env python
import argparse
import boto3
import datetime as dt
import math
import logging
import os
import requests
import sys
from copy import deepcopy
from urllib.parse import urlparse, urlencode

import aioboto3
import asyncio
import httpx
from dateutil.parser import parse
from pystac import Catalog, Collection, Item, CatalogType, layout, STAC_IO
from pdb import set_trace

logger = logging.getLogger(__name__)


def s3_read(uri):
    parsed = urlparse(uri)
    if parsed.scheme == 's3':
        bucket = parsed.netloc
        key = parsed.path[1:]
        s3 = boto3.resource('s3')
        obj = s3.Object(bucket, key)
        return obj.get()['Body'].read().decode('utf-8')
    else:
        return STAC_IO.default_read_text_method(uri)


async def s3_write(uri, txt):
    parsed = urlparse(uri)
    if parsed.scheme == 's3':
        bucket = parsed.netloc
        key = parsed.path[1:]
        async with aioboto3.resource("s3") as s3:
            obj = await s3.Object(bucket, key)
            await obj.put(Body=txt)
        #ogger.debug(f"Wrote {key}")
    else:
        await STAC_IO.default_write_text_method(uri, txt)

STAC_IO.read_text_method = s3_read
STAC_IO.write_text_method = s3_write


# split up a daterange into equal batches of date ranges
def split_dates(params, nbatches):
    dates = params.get('datetime', '').split('/')
    
    if len(dates) != 2:
        msg = "Do not know how to split up request without daterange"
        logger.error(msg)
        raise Exception(msg)
    start_date = parse(dates[0])
    if dates[1] == "now":
        stop_date = dt.datetime.now()
    else:
        stop_date = parse(dates[1])
    td = stop_date - start_date
    hours_per_batch = math.ceil(td.total_seconds()/3600/nbatches)
    ranges = []
    for i in range(0, nbatches-1):
        dt1 = start_date + dt.timedelta(hours=hours_per_batch*i)
        dt2 = dt1 + dt.timedelta(hours=hours_per_batch) - dt.timedelta(seconds=1)
        ranges.append([dt1, dt2])
    # insert last one
    ranges.append([
        ranges[-1][1] + dt.timedelta(seconds=1),
        stop_date
    ])

    new_params = []
    for r in ranges:
        _params = deepcopy(params)
        _params["datetime"] = f"{r[0].strftime('%Y-%m-%dT%H:%M:%S')}/{r[1].strftime('%Y-%m-%dT%H:%M:%S')}"
        logger.debug(f"Split date range: {_params['datetime']}")
        new_params.append(_params)
    return new_params


def hits(url, params):
    _params = deepcopy(params)
    _params['limit'] = 0
    payload_str = urlencode(_params, safe='/')
    resp = requests.get(url, params=payload_str, timeout=None).json()
    return resp['context']['matched']


# make single page query and add resulting items to collection
async def query_items_page(collection, url, client, semaphore, params={}, item_template="${year}/${month}/${day}"):
    page = params.get('page', 1)

    strategy = layout.BestPracticesLayoutStrategy()
    colpath = os.path.dirname(collection.get_self_href())
    _root_path = os.path.dirname(collection.get_root().get_self_href())

    payload_str = urlencode(params, safe='/')

    async with semaphore:
        logger.debug(f"{dt.datetime.now()}: Requesting page {page}")
        try:
            resp = await client.get(url, params=payload_str)
        except:
            resp = await client.get(url, params=payload_str)
        items = resp.json()['features']
        logger.debug(f"{dt.datetime.now()}: Retrieved page {page}")
        [collection.add_item(Item.from_dict(i)) for i in items]
        return len(items)


# run all async queries
async def query_items(collection, url, params, max_sync_queries=10, item_template="${year}/${month}/${day}"):
    found = hits(url, params)
    limit = params['limit']
    semaphore = asyncio.Semaphore(max_sync_queries)

    total_pages = math.ceil(found / limit)
    logger.info(f"Found {found} items ({total_pages} pages)")

    queries = []
    transport = httpx.AsyncHTTPTransport(retries=3)
    limits = httpx.Limits(max_keepalive_connections=None, max_connections=5000)
    async with httpx.AsyncClient(timeout=None, pool_limits=limits, transport=transport) as client:
        for p in range(1, total_pages+1):
            _params = {
                'page': p
            }
            _params.update(params)
            queries.append(query_items_page(collection, url, client, semaphore, params=_params, item_template=item_template))
        return await asyncio.gather(*queries)


# Copy items from API into collection
async def mirror_items(collection, url, params,  item_template="${year}/${month}/${day}", **kwargs):
    await query_items(collection, url, params, **kwargs)

    start = dt.datetime.now()
    # create/assign to subcatalogs as needed
    subcats = collection.generate_subcatalogs(item_template)
    logger.info(f"{collection.id}: generated {len(subcats)} subcatalogs in {dt.datetime.now()-start}")

    path = os.path.dirname(collection.get_self_href())
    start = dt.datetime.now()
    start = dt.datetime.now()
    col = await collection.save()
    logger.info(f"{collection.id}: saved in {dt.datetime.now()-start}")

def mirror_collections(url, path='', **kwargs):
    API_RELS = ['search', 'collections', 'next']

    cat = Catalog.from_file(url)

    empty_children = []
    total_items = 0
    for provider in cat.get_children():
        links = provider.get_child_links()
        if len(links):
            # remove API specific links
            [provider.remove_links(rel) for rel in API_RELS]
            # remove links from the collections
            for collection in provider.get_children():
                found = hits(collection.get_single_link('items').get_href(), {'limit': 0})
                [collection.remove_links(rel) for rel in ['child', 'next', 'items']]
                logger.info(f"{provider.id} - {collection.id}: {found} Items found")
                total_items += found
        else:
            empty_children.append(provider)

    [cat.remove_child(c.id) for c in empty_children]

    logger.info(f"{total_items} total Items found")
    cat.catalog_type = CatalogType.RELATIVE_PUBLISHED

    return cat


def parse_args(args):
    desc = 'STAC API to Static Catalog Utility'
    dhf = argparse.ArgumentDefaultsHelpFormatter
    parser0 = argparse.ArgumentParser(description=desc)

    pparser = argparse.ArgumentParser(add_help=False)
    pparser.add_argument('--url', help='Root API URL to copy', default=os.getenv('STAC_API_URL', None))
    pparser.add_argument('--limit', help='Page limit', type=int, default=500)
    pparser.add_argument('--max_sync_queries', help='Maximum synchronous queries', type=int, default=10)

    subparsers = parser0.add_subparsers(dest='command')

    parser = subparsers.add_parser('create', parents=[pparser], help='Create new catalog from API', formatter_class=dhf)
    parser.add_argument('--path', help='Save path', default='')

    parser = subparsers.add_parser('update', parents=[pparser], help='Update collection from API', formatter_class=dhf)
    parser.add_argument('cat', help='Catalog to add to')
    parser.add_argument('provider', help='Provider to update')
    parser.add_argument('collection', help='Collection to update')
    parser.add_argument('--datetime', help='Datetime range', default=None)
    parser.add_argument('--item_template', help='The item_template to use for layout', default="${year}/${month}/${day}")
    return vars(parser0.parse_args(args))


async def cli():
    args = parse_args(sys.argv[1:])

    logging.basicConfig(stream=sys.stdout, level=logging.DEBUG) #, format='%(asctime)-15s %(message)s')
    # quiet loggers
    for lg in ['httpx', 'urllib3', 'botocore', 'boto3', 'aioboto3', 'aiobotocore']:
        logging.getLogger(lg).propagate = False

    cmd = args.pop('command')
    if cmd == 'create':
        # create initial catalog through to collections
        cat = mirror_collections(args['url'], args['path'])
        cat.normalize_hrefs(args['path'])
        await cat.save()
    elif cmd == 'update':
        cat = Catalog.from_file(args['cat'], )
        collection = cat.get_child(args['provider']).get_child(args['collection'])
        
        url = f"{args['url']}/{args['provider']}/collections/{args['collection']}/items"
        params = {
            'limit': args['limit'],
        }
        if args['datetime'] is not None:
            params['datetime'] = args['datetime']
        await mirror_items(collection, url, params,
                           max_sync_queries=args['max_sync_queries'],
                           item_template=args['item_template'])


if __name__ == "__main__":
    asyncio.run(cli())