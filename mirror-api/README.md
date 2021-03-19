# CMR-STAC API Mirror

The script in this directory is for creating a static catalog from the CMR-STAC API. It can be run as a command line program and meant to be run on each collection separately (so that each collection could run in parallel).

First, create the initial catalog which contains the root catalog which links to the child catalogs for providers. Each of the provider catalogs links to the collections for that provider. Providers with no collections will be automatically removed from the static catalog.

```
$ mirror-api.py create --url https://cmr.earthdata.nasa.gov/cloudstac --path <output-path>
```

After the static catalog is created, use the CLI to mirror each collection.

```
$ mirror-api.py update --url https://cmr.earthdata.nasa.gov/cloudstac <output-path>/catalog.json <provider> <collection>
```

This command will query for Items in the Collection, 1 page at a time. Once it has all the pages it will create the subcatalogs for year, month, and day, then save all files to disk.

mirror-api can also take in a datetime range to limit the granules that are copied:

```
$ mirror-api.py update --url https://cmr.earthdata.nasa.gov/cloudstac <output-path>/catalog.json <provider> <collection> --datetime <YYYY-MM-DD/YYYY-MM-DD>
```