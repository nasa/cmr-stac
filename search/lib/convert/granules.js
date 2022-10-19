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
  logger,
  generateAppUrl,
  wfs,
  generateSelfUrl,
  createNavLink,
  makeCmrSearchUrl
} = require('../util');
const { inflectBox } = require('./geodeticCoordinates');
const cmr = require('../cmr');
const e = require('express');

const DATA_REL = 'http://esipfed.org/ns/fedsearch/1.1/data#';
const BROWSE_REL = 'http://esipfed.org/ns/fedsearch/1.1/browse#';
const SERVICE_REL = 'http://esipfed.org/ns/fedsearch/1.1/service#';

function cmrPolygonToGeoJsonPolygon (polygon) {
  return polygon.map((ringStr) => pointStringToPoints(ringStr));
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

const granPolyConverter = (polygons) => {
  const geometry = polygons.map(cmrPolygonToGeoJsonPolygon);
  let geoJsonSpatial;

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
  return null;
};

const granBoxConverter = (boxes) => {
  const geometry = boxes.map(cmrBoxToGeoJsonPolygon);
  let geoJsonSpatial;
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
  return null;
};

const granPointsConverter = (points) => {
  const geometry = points.map((ps) => {
      const [lat, lon] = parseOrdinateString(ps);
      return [lon, lat];
  });
  let geoJsonSpatial;

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
  return null;
};

const granLinesConverter = (lines) => {
  const geometry = lines.map(ls => {
      const linePoints = parseOrdinateString(ls);
      const orderedLines = reorderBoxValues(linePoints);
      return _.chunk(orderedLines, 2);
  });
  let geoJsonSpatial;

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
  return null;
};

function cmrSpatialToGeoJSONGeometry (gran) {
  const {boxes, lines, polygons, points} = gran;

  if (!(boxes || lines || polygons || points)) {
    logger.warn(`Spatial system unknown or missing in concept [${gran.id}]`);
    return;
  }

  if (polygons) return granPolyConverter(polygons);
  if (boxes) return granBoxConverter(boxes);
  if (points) return granPointsConverter(points);
  if (lines) return granLinesConverter(lines);
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

const linkToAsset = (l) => {
  const { href, type, title } = l;

  const asset = { href, type };
  if (title) {
    asset.title = title;
  }
  return asset;
};

/**
 * Return the cloud_cover extension and property.
 * Checks for `umm.ADDITIONAL_ATTRIBUTES' values on the granule
 *
 * @param {object} granule
 * @return {Array.<{extension:string, property:object}>|null}
 */
function cloudCoverAdditionalAttributeExtension (granule) {
  const eoExtension = 'https://stac-extensions.github.io/eo/v1.0.0/schema.json';
  if (!_.has(granule, 'umm.AdditionalAttributes')) return;

  const attributes = granule.umm.AdditionalAttributes;
  const cc = attributes.find(({ Name }) => Name === 'CLOUD_COVERAGE');
  if (!cc) return;
  const ccValue = parseInt(_.first(_.get(cc, 'Values')));
  if (Number.isNaN(ccValue)) {
    logger.warn(`Could not convert CLOUD_COVERAGE with values [${cc.Values}] to a integer.`);
    return;
  }
  return [eoExtension, { 'eo:cloud_cover': ccValue }];
}

/**
 * Return the cloud_cover extension and property.
 * Checks for `umm.CloudCover' values on the granule
 *
 * @param {object} granule
 * @return {Array.<{extension:string, property:object}>|null}
 */
function cloudCoverExtension (granule) {
  const eoExtension = 'https://stac-extensions.github.io/eo/v1.0.0/schema.json';

  if (!_.has(granule, 'umm.CloudCover')) return;

  const cc = granule.umm.CloudCover;
  return [eoExtension, {'eo:cloud_cover': cc}];
}

/**
 *
 */
function cmrGranuleToStac (event, parentCollection, granule) {
  const extensionBuilders = [
    cloudCoverExtension,
    cloudCoverAdditionalAttributeExtension
  ];

  const [extensions, properties] = extensionBuilders
    .reduce(([exts, props], extBldr) => {
      const data = extBldr(granule);

      if (!data) return [exts, props];

      const [newExt, newProps] = data;
      return [
        [...exts, newExt],
        {...props, ...newProps}
      ];
    }, [[], {}]);

  const { links,
          time_start,
          time_end } = granule;

  properties.datetime = time_start;
  properties.start_datetime = time_start;
  properties.end_datetime = time_end ? time_end : time_start;

  let dataLinks = [];
  let browseLink;
  let opendapLink;

  if (links) {
    dataLinks = links.filter(l => l.rel === DATA_REL && !l.inherited);
    browseLink = _.first(links.filter(l => l.rel === BROWSE_REL));
    opendapLink = _.first(links.filter(l => l.rel === SERVICE_REL && !l.inherited));
  }

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
  const collectionId = cmr.cmrCollectionToStacId(parentCollection.short_name, parentCollection.version_id);
  const gid = granule.title;
  const geometry = cmrSpatialToGeoJSONGeometry(granule);

  return {
    type: 'Feature',
    id: gid,
    stac_version: settings.stac.version,
    stac_extensions: extensions,
    collection: collectionId,
    geometry,
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

/**
 * Converts a list of granules to STAC items.
 */
function cmrGranulesToStac (event, parentColls, granules, hits = 0, params = {}) {
  const numberMatched = hits;
  const numberReturned = granules.length;

  const items = granules
        .map((granule) => cmrGranuleToStac(event, parentColls[granule.collection_concept_id], granule))
        .filter((item) => item); // remove nulls

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
