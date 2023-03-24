# Replace direct calls to the Common Metadata Repository with calls to GraphQL

Table of Contents:
* [Status](#status)
* [Context](#context)
* [Decision](#decision)
* [Consequences](#consequences)

## Status

__Accepted__

## Context

Using direct calls to CMR make it necessary to combine multiple call results to produce STAC items. There is also no mechanism to call for only what fields are needed. This results in extra overhead, both in terms of number of calls needed and extra data being returned that was ultimately discarded.

## Decision

Replace the logic in CMR-STAC to query GraphQL for data instead of querying directly to CMR.

## Consequences

### Pros
+ Constructing STAC responses requires far fewer calls to generate the same responses.
+ Calls to GraphQL return only what is is needed, and can be aliased resulting in simplified query logic.

### Cons
+ There is now an extra layer between STAC users and CMR, resulting in possible additional latency for calls.
+ GraphQL is now a direct dependency of STAC.
  + Any new queries must be supported by GraphQL first.
+ CMR does not support queries for Producrs, leaving at least one direct call to CMR in place.
