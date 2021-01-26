const settings = require('../settings');
const { wfs, generateAppUrl, makeCmrSearchUrl } = require('../util');
const {
  WHOLE_WORLD_BBOX,
  pointStringToPoints,
  parseOrdinateString,
  addPointsToBbox,
  mergeBoxes,
  reorderBoxValues
} = require('./bounding-box');

function cmrCollSpatialToExtents (cmrColl) {
  let bbox = null;
  if (cmrColl.polygons) {
    bbox = cmrColl.polygons
      .map((rings) => rings[0])
      .map(pointStringToPoints)
      .reduce(addPointsToBbox, bbox);
  } else if (cmrColl.points) {
    const points = cmrColl.points.map(parseOrdinateString);
    const orderedPoints = points.map(([lat, lon]) => [lon, lat]);
    bbox = addPointsToBbox(bbox, orderedPoints);
  } else if (cmrColl.lines) {
    const linePoints = cmrColl.lines.map(parseOrdinateString);
    const orderedLines = linePoints.map(reorderBoxValues);
    bbox = orderedLines.reduce((box, line) => mergeBoxes(box, line), bbox);
  } else if (cmrColl.boxes) {
    bbox = cmrColl.boxes
      .reduce((box, boxStr) => mergeBoxes(
        box,
        reorderBoxValues(parseOrdinateString(boxStr))), bbox);
  } else {
    // whole world bbox
    bbox = WHOLE_WORLD_BBOX;
  }
  return bbox;
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
  const collectionId = `${cmrCollection.short_name}.v${cmrCollection.version_id}`;
  const provider = cmrCollection.data_center;

  const links = [
    wfs.createLink('self', generateAppUrl(event, `/${provider}/collections/${collectionId}`),
      'Info about this collection'),
    wfs.createLink('root', generateAppUrl(event, ''),
      'Root catalog'),
    wfs.createLink('parent', generateAppUrl(event, `/${provider}`),
      'Parent catalog'),
    wfs.createLink('items', generateAppUrl(event, `/${provider}/collections/${collectionId}/items`),
      'Granules in this collection'),
    wfs.createLink('about', makeCmrSearchUrl(`/concepts/${cmrCollection.id}.html`),
      'HTML metadata for collection'),
    wfs.createLink('via', makeCmrSearchUrl(`/concepts/${cmrCollection.id}.json`),
      'CMR JSON metadata for collection')
  ];
  return links;
}

function cmrCollToWFSColl (event, cmrCollection) {
  if (!cmrCollection) return [];
  const collection = {
    id: `${cmrCollection.short_name}.v${cmrCollection.version_id}`,
    stac_version: settings.stac.version,
    license: cmrCollection.license || 'not-provided',
    title: cmrCollection.dataset_id,
    description: cmrCollection.summary,
    links: createLinks(event, cmrCollection),
    extent: createExtent(cmrCollection)
  };
  return collection;
}

module.exports = {
  cmrCollSpatialToExtents,
  cmrCollToWFSColl
};
