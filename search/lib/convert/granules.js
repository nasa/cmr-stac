const _ = require('lodash');
const settings = require('../settings');
const {
  addPointsToBbox,
  mergeBoxes,
  parseOrdinateString,
  pointStringToPoints,
  reorderBoxValues
} = require('./bounding-box');
const {
  generateAppUrl,
  wfs,
  generateSelfUrl,
  createNavLink,
  makeCmrSearchUrl
} = require('../util');
const { inflectBox } = require('./geodeticCoordinates');
const cmr = require('../cmr');
const Promise = require('bluebird');

const DATA_REL = 'http://esipfed.org/ns/fedsearch/1.1/data#';
const BROWSE_REL = 'http://esipfed.org/ns/fedsearch/1.1/browse#';
const DOC_REL = 'http://esipfed.org/ns/fedsearch/1.1/documentation#';

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
  let geoJsonSpatial;
  if (cmrGran.polygons) {
    geometry = geometry.concat(cmrGran.polygons.map(cmrPolygonToGeoJsonPolygon));
  } else if (cmrGran.boxes) {
    geometry = geometry.concat(cmrGran.boxes.map(cmrBoxToGeoJsonPolygon));
  }
  if (cmrGran.points) {
    geometry = geometry.concat(cmrGran.points.map((ps) => {
      const [lat, lon] = parseOrdinateString(ps);
      return { type: 'Point', coordinates: [lon, lat] };
    }));
  }
  if (cmrGran.lines) {
    geometry = cmrGran.lines.map(ls => {
      const linePoints = parseOrdinateString(ls);
      const orderedLines = reorderBoxValues(linePoints);
      return _.chunk(orderedLines, 2);
    });

    if (geometry.length > 1) {
      geoJsonSpatial = {
        type: 'MultiLineString',
        coordinates: geometry
      };
      return geoJsonSpatial;
    } else {
      geoJsonSpatial = {
        type: 'LineString',
        coordinates: geometry[0]
      };
      return geoJsonSpatial;
    }
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
    let points = cmrGran.polygons
      .map((rings) => rings[0])
      .map(pointStringToPoints);
    points = points[0].map(([lon, lat]) => [lat, lon]);
    const inflectedPoints = inflectBox(points).map(point => parseFloat(point.toFixed(6)));
    bbox = reorderBoxValues(inflectedPoints);
  } else if (cmrGran.points) {
    const points = cmrGran.points.map(parseOrdinateString);
    const orderedPoints = points.map(([lat, lon]) => [lon, lat]);
    bbox = addPointsToBbox(bbox, orderedPoints);
  } else if (cmrGran.lines) {
    const linePoints = cmrGran.lines.map(parseOrdinateString);
    const orderedLines = linePoints.map(reorderBoxValues);
    bbox = orderedLines.reduce((box, line) => mergeBoxes(box, line), bbox);
  } else if (cmrGran.boxes) {
    bbox = cmrGran.boxes
      .reduce((box, boxStr) => mergeBoxes(
        box,
        reorderBoxValues(parseOrdinateString(boxStr))), bbox);
  } else {
    bbox = [];
  }
  return bbox;
}

async function cmrGranuleToStac (event, granule) {
  const properties = {};

  properties.datetime = granule.time_start;
  properties.start_datetime = granule.time_start;
  properties.end_datetime = granule.time_end ? granule.time_end : granule.time_start;

  let dataLink;
  let browseLink;
  let opendapLink;

  const extensions = [];
  if (_.has(granule, 'umm.AdditionalAttributes')) {
    const attributes = granule.umm.AdditionalAttributes;
    const eo = attributes.filter(attr => attr.Name === 'CLOUD_COVERAGE');
    if (eo.length) {
      extensions.push('eo');
      const eoValue = eo[0].Values[0];
      properties['eo:cloud_cover'] = parseInt(eoValue);
    }
  }

  if (granule.links) {
    dataLink = granule.links.filter(l => l.rel === DATA_REL && !l.inherited);
    browseLink = _.first(
      granule.links.filter(l => l.rel === BROWSE_REL)
    );
    opendapLink = _.first(
      granule.links.filter(l => l.rel === DOC_REL && !l.inherited && l.href.includes('opendap'))
    );
  }

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
  if (dataLink && dataLink.length) {
    if (dataLink.length > 1) {
      dataLink.forEach(l => {
        const splitLink = l.href.split('.');
        const fileType = splitLink[splitLink.length - 2];
        assets[fileType] = linkToAsset(l);
      });
    } else {
      assets.data = linkToAsset(dataLink[0]);
    }
  }
  if (browseLink) {
    assets.browse = linkToAsset(browseLink);

    const splitBrowseLink = browseLink.href.split('.');
    const browseExtension = splitBrowseLink[splitBrowseLink.length - 1];

    switch (browseExtension) {
      case 'png':
        assets.browse.type = 'image/png';
        break;
      case 'tiff':
      case 'tif':
        assets.browse.type = 'image/tiff';
        break;
      case 'raw':
        assets.browse.type = 'image/raw';
        break;
      default:
        assets.browse.type = 'image/jpeg';
        break;
    }
  }
  if (opendapLink) {
    assets.opendap = linkToAsset(opendapLink);
  }

  assets.metadata = wfs.createAssetLink(makeCmrSearchUrl(`/concepts/${granule.id}.native`));
  const collectionId = await cmr.cmrCollectionIdToStacId(granule.collection_concept_id);
  return {
    type: 'Feature',
    id: granule.id,
    stac_version: settings.stac.version,
    stac_extensions: extensions,
    collection: collectionId,
    geometry: cmrSpatialToGeoJSONGeometry(granule),
    bbox: cmrSpatialToStacBbox(granule),
    links: [
      {
        rel: 'self',
        href: generateAppUrl(event,
          `/${granule.data_center}/collections/${collectionId}/items/${granule.id}`)
      },
      {
        rel: 'parent',
        href: generateAppUrl(event, `/${granule.data_center}/collections/${collectionId}`)
      },
      {
        rel: 'collection',
        href: generateAppUrl(event, `/${granule.data_center}/collections/${collectionId}`)
      },
      {
        rel: 'root',
        href: generateAppUrl(event, '/')
      },
      {
        rel: 'provider',
        href: generateAppUrl(event, `/${granule.data_center}`)
      },
      {
        rel: 'via',
        href: makeCmrSearchUrl(`/concepts/${granule.id}.json`)
      },
      {
        rel: 'via',
        href: makeCmrSearchUrl(`/concepts/${granule.id}.umm_json`)
      }
    ],
    properties: properties,
    assets
  };
}

async function cmrGranulesToStac (event, granules, hits = 0, params = {}) {
  const numberMatched = hits;
  const numberReturned = granules.length;

  const items = await Promise.map(granules, async (granule) => {
    return cmrGranuleToStac(event, granule);
  });

  const granulesResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    numberMatched,
    numberReturned,
    features: items,
    links: [
      {
        rel: 'self',
        href: generateSelfUrl(event)
      },
      {
        rel: 'root',
        href: generateAppUrl(event, '/')
      }
    ]
  };

  const currPage = parseInt(_.get(params, 'page', 1), 10);
  const limit = _.get(params, 'limit', 10);

  // total items up to and including this page
  const totalItems = (currPage - 1) * limit + numberReturned;

  if (currPage > 1 && totalItems > limit) {
    const navLink = createNavLink(event, params, 'prev');
    granulesResponse.links.push(navLink);
  }

  if (totalItems < numberMatched) {
    const navLink = createNavLink(event, params, 'next');
    granulesResponse.links.push(navLink);
  }

  return granulesResponse;
}

module.exports = {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrSpatialToStacBbox,
  cmrGranuleToStac,
  cmrGranulesToStac
};
