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
const SERVICE_REL = 'http://esipfed.org/ns/fedsearch/1.1/service#';

function cmrPolygonToGeoJsonPolygon (polygon) {
  const rings = polygon.map((ringStr) => pointStringToPoints(ringStr));
  return rings;
}

function cmrBoxToGeoJsonPolygon (box) {
  const [s, w, n, e] = parseOrdinateString(box);
  return [[
    [w, s],
    [e, s],
    [e, n],
    [w, n],
    [w, s]
  ]];
}

function cmrSpatialToGeoJSONGeometry (cmrGran) {
  let geometry = [];
  let geoJsonSpatial;

  // Polygons
  if (cmrGran.polygons) {
    geometry = geometry.concat(cmrGran.polygons.map(cmrPolygonToGeoJsonPolygon));
    if (geometry.length > 1) {
      geoJsonSpatial = {
        type: 'MultiPolygon',
        coordinates: geometry
      };
      return geoJsonSpatial;
    } else if (geometry.length === 1) {
      geoJsonSpatial = {
        type: 'Polygon',
        coordinates: geometry[0]
      };
      return geoJsonSpatial;
    }
  }

  if (cmrGran.boxes) {
    geometry = geometry.concat(cmrGran.boxes.map(cmrBoxToGeoJsonPolygon));
    if (geometry.length > 1) {
      geoJsonSpatial = {
        type: 'MultiPolygon',
        coordinates: geometry
      };
      return geoJsonSpatial;
    } else if (geometry.length === 1) {
      geoJsonSpatial = {
        type: 'Polygon',
        coordinates: geometry[0]
      };
      return geoJsonSpatial;
    }
  }

  // Points
  if (cmrGran.points) {
    geometry = geometry.concat(cmrGran.points.map((ps) => {
      const [lat, lon] = parseOrdinateString(ps);
      return [lon, lat];
    }));
    if (geometry.length > 1) {
      geoJsonSpatial = {
        type: 'MultiPoint',
        coordinates: geometry
      };
      return geoJsonSpatial;
    } else if (geometry.length === 1) {
      geoJsonSpatial = {
        type: 'Point',
        coordinates: geometry[0]
      };
      return geoJsonSpatial;
    }
  }

  // Lines
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
    } else if (geometry.length === 1) {
      geoJsonSpatial = {
        type: 'LineString',
        coordinates: geometry[0]
      };
      return geoJsonSpatial;
    }
  }

  throw new Error(`Unknown spatial ${JSON.stringify(cmrGran)}`);
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
  const extensions = [];

  properties.datetime = granule.time_start;
  properties.start_datetime = granule.time_start;
  properties.end_datetime = granule.time_end ? granule.time_end : granule.time_start;

  if (_.has(granule, 'umm.CloudCover')) {
    const eo = granule.umm.CloudCover;
    extensions.push('https://stac-extensions.github.io/eo/v1.0.0/schema.json');
    properties['eo:cloud_cover'] = eo;
  } else if (_.has(granule, 'umm.AdditionalAttributes')) {
     // HACK: CMR-8623 this is block should be removed after providers update their metadata
    const attributes = granule.umm.AdditionalAttributes;
    const eo = attributes.filter(attr => attr.Name === 'CLOUD_COVERAGE');
    if (eo.length) {
      extensions.push('https://stac-extensions.github.io/eo/v1.0.0/schema.json');
      const eoValue = eo[0].Values[0];
      properties['eo:cloud_cover'] = parseInt(eoValue);
    }
  }

  const dataLinks = granule.links.filter(l => l.rel === DATA_REL && !l.inherited);

  let browseLink = _.first(granule.links.filter(l => l.rel === BROWSE_REL));
  let opendapLink = _.first(granule.links.filter(l => l.rel === SERVICE_REL && !l.inherited));

  const linkToAsset = (l) => {
    const {href, type, title} = l;
    return {href, type, title};
  };

  const assets = {};

  if (dataLinks.length > 1) {
    dataLinks.forEach(l => {
      const splitLink = l.href.split('.');
      const fileType = splitLink[splitLink.length - 2];
      assets[fileType] = linkToAsset(l);
    });
  } else if (dataLinks.length === 1) {
    assets.data = linkToAsset(dataLinks[0]);
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
  let { ShortName, EntryTitle, Version } = granule.umm.CollectionReference;
  if (EntryTitle) {
    const collections = await cmr.findCollections({ entry_title: EntryTitle });
    if (collections.length === 0) {
      return null;
    } else {
      ShortName = collections[0].short_name;
      Version = collections[0].version_id;
    }
  }
  const collectionId = cmr.cmrCollectionToStacId(ShortName, Version);
  const gid = granule.umm.GranuleUR;
  return {
    type: 'Feature',
    id: gid,
    stac_version: settings.stac.version,
    stac_extensions: extensions,
    collection: collectionId,
    geometry: cmrSpatialToGeoJSONGeometry(granule),
    bbox: cmrSpatialToStacBbox(granule),
    links: [
      {
        rel: 'self',
        href: generateAppUrl(event,
          `/${granule.data_center}/collections/${collectionId}/items/${gid}`)
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
