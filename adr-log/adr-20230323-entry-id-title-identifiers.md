# Continue using entry_id and title as the respective Collection and Granule/Item identifiers

Table of Contents:

* [Status](#status)
* [Context](#context)
* [Decision](#decision)
* [Consequences](#consequences)

## Status

__Accepted__

## Context

The initial implementation of [CMR-STAC using GraphQL](./adr-20221201-graphql-backend.md "graphql-backend") had converted the collection and granule identifiers to using CMR conceptIds. This resulted in breaking the functionality of many CMR-STAC community users workflows, scripts, and tools.

## Decision

To maintain functionality of existing scripts and queries with a minimal amount of changes, CMR-STAC will continue to support ".v" as a separator for searches.

## Consequences

There is ambiguousness regarding collections when the shortName contains a ".v" separator. The `.v` must be converted to an underscore to be transformed into a valid CMR `entry_id`. This transformation is only required for navigating directly to a collection or item

### Bookmarked Collections

Bookmarked collection pages will need to be updated to change the ".v" to "_":

* INCORRECT `/stac/provider/collections/myCollection.v1`
* CORRECT   `/stac/provider/collections/myCollection_1`

This fixes ambiguousness of separators, and this currently affects the existing deployed PROD STAC, and has since the initial implementation of CMR-STAC. If there was a collection called `myColl.volume` with a version of `2` it would be listed as `myColl.volume.v2` which CMR-STAC incorrectly would convert to the equivalent `{shortName: "myColl", version: "olume.v2"}` because it only split on the first instance of the `.v` separator. This issue has affected all versions of CMR-STAC.

By switching to the `entry_id` syntax no parsing or guessing is needed to retrieve the correct collection.

### Searches
Searches using collections with a `.v` separator will continue to work, but with the consequence of added uncertentainty.
Collections created without a version or set with an ambiguous version will need to have the appropriate placeholder appended. Examples of such non-versions are  `Not applicable`, `Not provided` and `None`.
Such an example of a collection would be `10.3334/cdiac/otg.vos_alligatorhope_1999-2001_Not applicable`.

The unencoded URL would be `/stac/NOAA_NCEI/collections/10.3334/cdiac/otg.vos_alligatorhope_1999-2001_Not applicable` and would result in 404 exception.

The encoded `entry_id` would be transformed into `/stac/NOAA_NCEI/collections/10.3334%2Fcdiac%2Fotg.vos_alligatorhope_1999-2001_Not+applicable` which would yield the correct collection.

### URI Encoding
Because CMR shortNames can contain characters that would break URLs, it is recommended that the collection ID and item IDs be URI encoded.
* If browsing or searching using CMR-STAC the values returned will be automatically encoded.
* If manually entering values containing special characters, they must be manually URI encoded.
