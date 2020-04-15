const _ = require('lodash');
const cmr = require('../cmr');
const { pointStringToPoints, parseOrdinateString } = require('./bounding-box');
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

const DATA_REL = 'http://esipfed.org/ns/fedsearch/1.1/data#';
const BROWSE_REL = 'http://esipfed.org/ns/fedsearch/1.1/browse#';
const DOC_REL = 'http://esipfed.org/ns/fedsearch/1.1/documentation#';

function cmrGranToFeatureGeoJSON (event, cmrGran) {
  // eslint-disable-next-line camelcase
  const datetime = cmrGran.time_start.toString();
  // eslint-disable-next-line camelcase
  const start_datetime = cmrGran.time_start.toString();
  // eslint-disable-next-line camelcase
  let end_datetime = cmrGran.time_start.toString();
  if (cmrGran.time_end) {
    // eslint-disable-next-line camelcase
    end_datetime = cmrGran.time_end.toString();
  }

  const dataLink = _.first(
    cmrGran.links.filter(l => l.rel === DATA_REL && !l.inherited)
  );
  const browseLink = _.first(
    cmrGran.links.filter(l => l.rel === BROWSE_REL)
  );
  const opendapLink = _.first(
    cmrGran.links.filter(l => l.rel === DOC_REL && !l.inherited && l.href.includes('opendap'))
  );

  const linkToAsset = (l) => ({
    name: l.title,
    href: l.href,
    type: l.type
  });

  const assets = {};
  if (dataLink) {
    assets.data = linkToAsset(dataLink);
  }
  if (browseLink) {
    assets.browse = linkToAsset(browseLink);
  }
  if (opendapLink) {
    assets.opendap = linkToAsset(opendapLink);
  }

  return {
    type: 'Feature',
    id: cmrGran.id,
    collection: cmrGran.collection_concept_id,
    geometry: cmrSpatialToGeoJSONGeometry(cmrGran),
    links: {
      self: {
        rel: 'self',
        href: generateAppUrl(event,
          `/collections/${cmrGran.collection_concept_id}/items/${cmrGran.id}`)
      },
      parent: {
        rel: 'parent',
        href: generateAppUrl(event, `/collections/${cmrGran.collection_concept_id}`)
      },
      collection: {
        rel: 'collection',
        href: generateAppUrl(event, `/collections/${cmrGran.collection_concept_id}`)
      },
      root: {
        rel: 'root',
        href: generateAppUrl(event)
      },
      metadata: wfs.createLink('metadata', cmr.makeCmrSearchUrl(`/concepts/${cmrGran.id}.native`))
    },
    properties: {
      provider: cmrGran.data_center,
      datetime,
      start_datetime,
      end_datetime
    },
    assets
  };
}

function cmrGranulesToFeatureCollection (event, cmrGrans) {
  const currPage = parseInt(extractParam(event.queryStringParameters, 'page_num', '1'), 10);
  const nextPage = currPage + 1;
  const newParams = { ...event.queryStringParameters } || {};
  newParams.page_num = nextPage;
  const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

  return {
    type: 'FeatureCollection',
    features: cmrGrans.map(g => cmrGranToFeatureGeoJSON(event, g)),
    links: {
      self: generateSelfUrl(event),
      next: nextResultsLink
    }
  };
}

module.exports = {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrGranToFeatureGeoJSON,
  cmrGranulesToFeatureCollection
};
