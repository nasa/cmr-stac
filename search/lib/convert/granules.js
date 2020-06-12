const _ = require('lodash');
const cmr = require('../cmr');
const settings = require('../settings');
const { pointStringToPoints, parseOrdinateString, addPointsToBbox, mergeBoxes, reorderBoxValues } = require('./bounding-box');
const { generateAppUrl, generateAppUrlWithoutRelativeRoot, wfs, extractParam, generateSelfUrl } = require('../util');

function cmrPolygonToGeoJsonPolygon (polygon) {
  const rings = polygon.map((ringStr) => pointStringToPoints(ringStr));
  return {
    type: 'Polygon',
    coordinates: rings
  };
}

function cmrBoxToGeoJsonPolygon (box) {
  const [s, w, n, e] = parseOrdinateString(box);
  return {
    type: 'Polygon',
    coordinates: [[
      [w, s],
      [e, s],
      [e, n],
      [w, n],
      [w, s]
    ]]
  };
}

function cmrSpatialToGeoJSONGeometry (cmrGran) {
  let geometry = [];
  if (cmrGran.polygons) {
    geometry = geometry.concat(cmrGran.polygons.map(cmrPolygonToGeoJsonPolygon));
  }
  if (cmrGran.boxes) {
    geometry = geometry.concat(cmrGran.boxes.map(cmrBoxToGeoJsonPolygon));
  }
  if (cmrGran.points) {
    geometry = geometry.concat(cmrGran.points.map((ps) => {
      const [lon, lat] = parseOrdinateString(ps);
      return { type: 'Point', coordinates: [lon, lat] };
    }));
  }
  if (geometry.length === 0) {
    throw new Error(`Unknown spatial ${JSON.stringify(cmrGran)}`);
  }
  if (geometry.length === 1) {
    return geometry[0];
  }
  return {
    type: 'GeometryCollection',
    geometries: geometry
  };
}

function cmrSpatialToStacBbox (cmrGran) {
  let bbox = null;
  if (cmrGran.polygons) {
    bbox = cmrGran.polygons
      .map((rings) => rings[0])
      .map(pointStringToPoints)
      .reduce(addPointsToBbox, bbox);
  }
  if (cmrGran.points) {
    const points = cmrGran.points.map(parseOrdinateString);
    bbox = addPointsToBbox(bbox, points);
  }
  if (cmrGran.boxes) {
    const mergedBox = cmrGran.boxes.reduce((box, boxStr) => mergeBoxes(box, parseOrdinateString(boxStr)), bbox);
    bbox = reorderBoxValues(mergedBox);
  }
  if (bbox === null) {
    bbox = [];
  }
  return bbox;
}

const DATA_REL = 'http://esipfed.org/ns/fedsearch/1.1/data#';
const BROWSE_REL = 'http://esipfed.org/ns/fedsearch/1.1/browse#';
const DOC_REL = 'http://esipfed.org/ns/fedsearch/1.1/documentation#';

function cmrGranToFeatureGeoJSON (event, cmrGran) {
  const datetime = cmrGran.time_start;
  const startDatetime = cmrGran.time_start;
  const endDatetime = cmrGran.time_end ? cmrGran.time_end : cmrGran.time_start;

  const dataLink = _.first(
    cmrGran.links.filter(l => l.rel === DATA_REL && !l.inherited)
  );
  const browseLink = _.first(
    cmrGran.links.filter(l => l.rel === BROWSE_REL)
  );
  const opendapLink = _.first(
    cmrGran.links.filter(l => l.rel === DOC_REL && !l.inherited && l.href.includes('opendap'))
  );

  const linkToAsset = (l) => {
    if (l.title === undefined) {
      return {
        href: l.href,
        type: l.type
      };
    } else {
      return {
        name: l.title,
        href: l.href,
        type: l.type
      };
    }
  };

  const assets = {};
  if (dataLink) {
    assets.data = linkToAsset(dataLink);
  }
  if (browseLink) {
    assets.browse = linkToAsset(browseLink);

    if (browseLink.href.includes('.png')) {
      assets.browse.type = 'images/png';
    }
    if (browseLink.href.includes('.tiff')) {
      assets.browse.type = 'images/tiff';
    }
    if (browseLink.href.includes('.tif')) {
      assets.browse.type = 'images/tiff';
    }
    if (browseLink.href.includes('.raw')) {
      assets.browse.type = 'images/raw';
    } else {
      assets.browse.type = 'images/jpeg';
    }
  }
  if (opendapLink) {
    assets.opendap = linkToAsset(opendapLink);
  }

  assets.metadata = wfs.createAssetLink(cmr.makeCmrSearchUrl(`/concepts/${cmrGran.id}.native`));
  return {
    type: 'Feature',
    id: cmrGran.id,
    short_name: cmrGran.short_name,
    stac_version: settings.stac.version,
    collection: cmrGran.collection_concept_id,
    geometry: cmrSpatialToGeoJSONGeometry(cmrGran),
    bbox: cmrSpatialToStacBbox(cmrGran),
    links: [
      {
        rel: 'self',
        href: generateAppUrl(event,
          `/${cmrGran.data_center}/collections/${cmrGran.collection_concept_id}/items/${cmrGran.id}`)
      },
      {
        rel: 'parent',
        href: generateAppUrl(event, `/${cmrGran.data_center}/collections/${cmrGran.collection_concept_id}`)
      },
      {
        rel: 'collection',
        href: generateAppUrl(event, `/${cmrGran.data_center}/collections/${cmrGran.collection_concept_id}`)
      },
      {
        rel: 'root',
        href: generateAppUrl(event)
      },
      {
        rel: 'provider',
        href: generateAppUrl(event, `/${cmrGran.data_center}/collections`)
      }
    ],
    properties: {
      datetime,
      start_datetime: startDatetime,
      end_datetime: endDatetime
    },
    assets
  };
}

function cmrGranulesToFeatureCollection (event, cmrGrans) {
  if (event.queryStringParameters.page_num > 1) {
    const currPage = event.queryStringParameters.page_num;
    const nextPage = currPage + 1;
    const prevPage = currPage - 1;
    const newParams = { ...event.queryStringParameters } || {};
    newParams.page_num = nextPage;
    const newPrevParams = { ...event.queryStringParameters } || {};
    newPrevParams.page_num = prevPage;
    const prevResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newPrevParams);
    const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

    return {
      type: 'FeatureCollection',
      stac_version: settings.stac.version,
      features: cmrGrans.map(g => cmrGranToFeatureGeoJSON(event, g)),
      links: {
        self: generateSelfUrl(event),
        prev: prevResultsLink,
        next: nextResultsLink
      }
    };
  }

  const currPage = parseInt(extractParam(event.queryStringParameters, 'page_num', '1'), 10);
  const nextPage = currPage + 1;
  const newParams = { ...event.queryStringParameters } || {};
  newParams.page_num = nextPage;
  const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

  return {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    features: cmrGrans.map(g => cmrGranToFeatureGeoJSON(event, g)),
    links: [
      {
        self: generateSelfUrl(event),
        next: nextResultsLink
      }
    ]
  };
}

module.exports = {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrSpatialToStacBbox,
  cmrGranToFeatureGeoJSON,
  cmrGranulesToFeatureCollection
};
