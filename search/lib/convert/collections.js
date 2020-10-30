const cmr = require('../cmr');
const settings = require('../settings');
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
    const orderedPoints = points.map(([lat, lon]) => [lon, lat]);
    bbox = addPointsToBbox(bbox, orderedPoints);
  }
  if (cmrColl.lines) {
    const linePoints = cmrColl.lines.map(parseOrdinateString);
    const orderedLines = linePoints.map(reorderBoxValues);
    return orderedLines.reduce((box, line) => mergeBoxes(box, line), bbox);
  }
  if (cmrColl.boxes) {
    bbox = cmrColl.boxes.reduce((box, boxStr) => mergeBoxes(box, reorderBoxValues(parseOrdinateString(boxStr))), bbox);
  }
  if (bbox === null) {
    // whole world bbox
    bbox = WHOLE_WORLD_BBOX;
  }
  return bbox;
}

function stacSearchWithCurrentParams (event, collId, collProvider) {
  const newParams = { ...event.queryStringParameters } || {};
  newParams.collections = collId;
  delete newParams.provider;
  delete newParams.page_num;
  return generateAppUrl(event, `/${collProvider}/search`, newParams);
}

function cmrGranuleSearchWithCurrentParams (event, collId) {
  const newParams = { ...event.queryStringParameters } || {};
  newParams.collection_concept_id = collId;
  delete newParams.collectionId;
  delete newParams.provider;
  delete newParams.page_num;
  return cmr.makeCmrSearchUrl('granules.json', newParams);
}

function createExtent (cmrCollection) {
  return {
    crs: 'http://www.opengis.net/def/crs/OGC/1.3/CRS84',
    spatial: { bbox: [cmrCollSpatialToExtents(cmrCollection)] },
    trs: 'http://www.opengis.net/def/uom/ISO-8601/0/Gregorian',
    temporal: {
      interval: [
        [
          cmrCollection.time_start,
          (cmrCollection.time_end || null)
        ]
      ]
    }
  };
}

function createLinks (event, cmrCollection) {
  const id = cmrCollection.id;
  const provider = cmrCollection.data_center;
  return [
    wfs.createLink('self', generateAppUrl(event, `/${provider}/collections/${id}`),
      'Info about this collection'),
    wfs.createLink('root', generateAppUrl(event, ""),
      'Root catalog'),
    wfs.createLink('parent', generateAppUrl(event, `/${provider}`),
      'Parent catalog'),
    wfs.createLink('stac', stacSearchWithCurrentParams(event, id, provider),
      'STAC Search this collection'),
    wfs.createLink('cmr', cmrGranuleSearchWithCurrentParams(event, id),
      'CMR Search this collection'),
    wfs.createLink('items', generateAppUrl(event, `/${provider}/collections/${id}/items`),
      'Granules in this collection'),
    wfs.createLink('overview', cmr.makeCmrSearchUrl(`/concepts/${id}.html`),
      'HTML metadata for collection'),
    wfs.createLink('metadata', cmr.makeCmrSearchUrl(`/concepts/${id}.native`),
      'Native metadata for collection'),
    wfs.createLink('metadata', cmr.makeCmrSearchUrl(`/concepts/${id}.umm_json`),
      'JSON metadata for collection')
  ];
}

function cmrCollToWFSColl (event, cmrCollection) {
  if (!cmrCollection) return [];
  return {
    id: cmrCollection.id,
    short_name: cmrCollection.short_name,
    stac_version: settings.stac.version,
    license: cmrCollection.license || 'not-provided',
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
