const cmr = require('../cmr');
const { wfs, generateAppUrl } = require('../util');
const { WHOLE_WORLD_BBOX, pointStringToPoints, parseOrdinateString, addPointsToBbox, mergeBoxes, reorderBoxValues } = require('./bounding-box');

function cmrCollSpatialToExtents (cmrColl) {
  let bbox = null;
  if (cmrColl.polygons) {
    bbox = cmrColl.polygons
      .map((rings) => rings[0])
      .map(pointStringToPoints)
      .reduce(addPointsToBbox, bbox);
  }
  if (cmrColl.points) {
    const points = cmrColl.points.map(parseOrdinateString);
    bbox = addPointsToBbox(bbox, points);
  }
  if (cmrColl.lines) {
    throw new Error(`Unexpected spatial extent of lines in ${cmrColl.id}`);
  }
  if (cmrColl.boxes) {
    const mergedBox = cmrColl.boxes.reduce((box, boxStr) => mergeBoxes(box, parseOrdinateString(boxStr)), bbox);
    bbox = reorderBoxValues(mergedBox);
  }
  if (bbox === null) {
    // whole world bbox
    bbox = WHOLE_WORLD_BBOX;
  }
  return bbox;
}

function stacSearchWithCurrentParams (event, collId) {
  const newParams = { ...event.queryStringParameters } || {};
  newParams.collectionId = collId;
  delete newParams.provider;
  return generateAppUrl(event, '/stac/search', newParams);
}

function cmrGranuleSearchWithCurrentParams (event, collId) {
  const newParams = { ...event.queryStringParameters } || {};
  newParams.collection_concept_id = collId;
  delete newParams.collectionId;
  delete newParams.provider;
  return cmr.makeCmrSearchUrl('granules.json', newParams);
}

function createExtent (cmrCollection) {
  return {
    crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
    spatial: cmrCollSpatialToExtents(cmrCollection),
    trs: 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian',
    temporal: [
      cmrCollection.time_start,
      (cmrCollection.time_end || null)
    ]
  };
}

function createLinks (event, cmrCollection) {
  return [
    wfs.createLink('self', generateAppUrl(event, `/collections/${cmrCollection.id}`),
      'Info about this collection'),
    wfs.createLink('stac', stacSearchWithCurrentParams(event, cmrCollection.id),
      'STAC Search this collection'),
    wfs.createLink('cmr', cmrGranuleSearchWithCurrentParams(event, cmrCollection.id),
      'CMR Search this collection'),
    wfs.createLink('items', generateAppUrl(event, `/collections/${cmrCollection.id}/items`),
      'Granules in this collection'),
    wfs.createLink('overview', cmr.makeCmrSearchUrl(`/concepts/${cmrCollection.id}.html`),
      'HTML metadata for collection'),
    wfs.createLink('metadata', cmr.makeCmrSearchUrl(`/concepts/${cmrCollection.id}.native`),
      'Native metadata for collection'),
    wfs.createLink('metadata', cmr.makeCmrSearchUrl(`/concepts/${cmrCollection.id}.umm_json`),
      'JSON metadata for collection')
  ];
}

function cmrCollToWFSColl (event, cmrCollection) {
  if (!cmrCollection) return null;
  return {
    id: cmrCollection.id,
    title: cmrCollection.dataset_id,
    description: cmrCollection.summary,
    links: createLinks(event, cmrCollection),
    extent: createExtent(cmrCollection)
  };
}

module.exports = {
  cmrCollSpatialToExtents,
  stacSearchWithCurrentParams,
  cmrGranuleSearchWithCurrentParams,
  cmrCollToWFSColl
};
