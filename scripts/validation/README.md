# CMR-STAC Validator

The script in this directory will crawl the provided CMR-STAC root catalog, validating all provider endpoints, all collections within a provider, and one Item from each Collection.

First, install the requirements:

```
$ pip install -r requirements.txt
```

Then run the script providing the URL to the CMR-STAC root catalog, e.g., 

```
$ ./validate.py https://cmr.earthdata.nasa.gov/stac
```

The script will print the progress by printing out each CMR Provider, Collection, and Item it validates. In the case of an error it will print a message that says "INVALID", along with the URL to the invalid STAC object and the error message.

The best way to use the script is to pipe the output to a log file so that it can be looked at and searched for afterwards:

```
$ ./validate.py https://cmr.earthdata.nasa.gov/stac > cmr-stac-validation.log
```
