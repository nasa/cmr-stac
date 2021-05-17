#!/usr/bin/env python

import argparse
import logging
import os
import sys
from datetime import datetime

import requests

from stac_validator.stac_validator import StacValidate


VERBOSE = True


def validate(obj):
    validator = StacValidate()
    validator.validate_dict(obj)
    if not validator.valid:
        self_link = [l['href'] for l in obj['links'] if l['rel'] == 'self'][0]
        print(f"INVALID {self_link}: {validator.message[-1]['error_message']}")
    return validator.valid


def crawl_collection(collection, nitems=1):
    print(f"{datetime.now()} Collection: {collection['id']}", flush=True)
    valid = validate(collection)
    if valid:
        items_link = [l['href'] for l in collection['links'] if l['rel'] == 'items'][0] + f"?limit={nitems}"
        items = requests.get(items_link).json()
        for i, item in enumerate(items['features']):
            print(f"{datetime.now()} Item: {item['id']}")
            if i == nitems:
                break
            valid = validate(item)
    return valid


def get_collections(provider):
    for url in [l['href'] for l in provider['links'] if l['rel'] == 'child']:
        yield requests.get(url).json()
    next_link = [l['href'] for l in provider['links'] if l['rel'] == 'next']
    if len(next_link) == 1:
        next_provider = requests.get(next_link[0]).json()
        yield from get_collections(next_provider)


def crawl_provider(url, nitems=1):
    provider = requests.get(url).json()
    print(f"{datetime.now()} Provider {provider['id']}")
    validate(provider)
    count = 0
    for collection in get_collections(provider):
        crawl_collection(collection, nitems=nitems)
        count += 1
    print(f"{datetime.now()} Provider {provider.id}: {count} collections", flush=True)


def read_json(url):
    resp = requests.get(url).json()


# crawl from root catalog
def crawl(url, nitems=1):
    cat = requests.get(url).json()
    for provider in [l['href'] for l in cat['links'] if l['rel'] == 'child']:
        crawl_provider(provider, nitems=nitems)


def parse_args(args):
    desc = 'STAC API to Static Catalog Utility'
    dhf = argparse.ArgumentDefaultsHelpFormatter
    parser0 = argparse.ArgumentParser(description=desc)

    parser0.add_argument('url', help='Root API URL to copy', default=os.getenv('STAC_URL', None))
    parser0.add_argument('--nitems', help='Items per collection to validate', type=int, default=1)

    return vars(parser0.parse_args(args))


def cli():
    args = parse_args(sys.argv[1:])

    url = args.pop('url')
    crawl(url, **args)


if __name__ == "__main__":
    cli()