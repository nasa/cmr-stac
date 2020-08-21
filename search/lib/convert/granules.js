const _ = require('lodash');
const cmr = require('../cmr');
const settings = require('../settings');
const { pointStringToPoints, parseOrdinateString, addPointsToBbox, mergeBoxes, reorderBoxValues } = require('./bounding-box');
const { inflectBox } = require('./geodeticCoordinates');
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
  let geoJsonSpatial;
  if (cmrGran.polygons) {
    geometry = geometry.concat(cmrGran.polygons.map(cmrPolygonToGeoJsonPolygon));
  }
  if (cmrGran.boxes) {
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
    // bbox = cmrGran.polygons
    // .map((rings) => rings[0])
    // .map(pointStringToPoints);
    // .reduce(addPointsToBbox, bbox);
    const polygonPoints = cmrGran.polygons.map((rings) => rings[0])
      .map(pointStringToPoints);
    console.log(polygonPoints);
    bbox = inflectBox(polygonPoints[0]);
  }
  if (cmrGran.points) {
    const points = cmrGran.points.map(parseOrdinateString);
    const orderedPoints = points.map(([lat, lon]) => [lon, lat]);
    bbox = addPointsToBbox(bbox, orderedPoints);
  }
  if (cmrGran.lines) {
    const linePoints = cmrGran.lines.map(parseOrdinateString);
    const orderedLines = linePoints.map(reorderBoxValues);
    return orderedLines.reduce((box, line) => mergeBoxes(box, line), bbox);
  }
  if (cmrGran.boxes) {
    bbox = cmrGran.boxes.reduce((box, boxStr) => mergeBoxes(box, reorderBoxValues(parseOrdinateString(boxStr))), bbox);
  }
  if (bbox === null) {
    bbox = [];
  }
  return bbox;
}

const DATA_REL = 'http://esipfed.org/ns/fedsearch/1.1/data#';
const BROWSE_REL = 'http://esipfed.org/ns/fedsearch/1.1/browse#';
const DOC_REL = 'http://esipfed.org/ns/fedsearch/1.1/documentation#';

function cmrGranToFeatureGeoJSON (event, cmrGran, cmrGranUmm = {}) {
  const properties = {};

  properties.datetime = cmrGran.time_start;
  properties.start_datetime = cmrGran.time_start;
  properties.end_datetime = cmrGran.time_end ? cmrGran.time_end : cmrGran.time_start;

  let dataLink;
  let browseLink;
  let opendapLink;

  const extensions = [];
  if (!_.isEmpty(cmrGranUmm) && cmrGranUmm.umm.AdditionalAttributes) {
    const attributes = cmrGranUmm.umm.AdditionalAttributes;
    const eo = attributes.filter(attr => attr.Name === 'CLOUD_COVERAGE');
    if (eo.length) {
      extensions.push('eo');
      const eoValue = eo[0].Values[0];
      properties['eo:cloud_cover'] = parseInt(eoValue);
    }
  }

  if (cmrGran.links) {
    dataLink = cmrGran.links.filter(l => l.rel === DATA_REL && !l.inherited);
    browseLink = _.first(
      cmrGran.links.filter(l => l.rel === BROWSE_REL)
    );
    opendapLink = _.first(
      cmrGran.links.filter(l => l.rel === DOC_REL && !l.inherited && l.href.includes('opendap'))
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

  assets.metadata = wfs.createAssetLink(cmr.makeCmrSearchUrl(`/concepts/${cmrGran.id}.native`));
  return {
    type: 'Feature',
    id: cmrGran.id,
    short_name: cmrGran.short_name,
    stac_version: settings.stac.version,
    stac_extensions: extensions,
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
        href: generateAppUrl(event, `/${cmrGran.data_center}/collections/${cmrGran.collection_concept_id}/items`)
      },
      {
        rel: 'collection',
        href: generateAppUrl(event, `/${cmrGran.data_center}/collections/${cmrGran.collection_concept_id}`)
      },
      {
        rel: 'root',
        href: generateAppUrl(event, '/')
      },
      {
        rel: 'provider',
        href: generateAppUrl(event, `/${cmrGran.data_center}`)
      }
    ],
    properties: properties,
    assets
  };
}

function cmrGranulesToFeatureCollection (event, cmrGrans, cmrGransUmm = []) {
  const currPage = parseInt(extractParam(event.queryStringParameters, 'page_num', '1'), 10);
  const nextPage = currPage + 1;
  const prevPage = currPage - 1;
  const newParams = { ...event.queryStringParameters } || {};
  newParams.page_num = nextPage;
  const newPrevParams = { ...event.queryStringParameters } || {};
  newPrevParams.page_num = prevPage;
  const prevResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newPrevParams);
  const nextResultsLink = generateAppUrlWithoutRelativeRoot(event, event.path, newParams);

  let features = [];
  if (cmrGransUmm.length) {
    for (const gran in cmrGrans) {
      const stacItem = cmrGranToFeatureGeoJSON(event, cmrGrans[gran], cmrGransUmm[gran]);
      features.push(stacItem);
    }
  } else {
    features = cmrGrans.map(gran => cmrGranToFeatureGeoJSON(event, gran));
  }
  const granulesResponse = {
    type: 'FeatureCollection',
    stac_version: settings.stac.version,
    features: features,
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

  if (currPage > 1 && granulesResponse.links.length > 1) {
    granulesResponse.links.push({
      rel: 'prev',
      href: prevResultsLink
    });
  }

  if (granulesResponse.features.length === 10) {
    granulesResponse.links.push({
      rel: 'next',
      href: nextResultsLink
    });
  }

  return granulesResponse;
}

module.exports = {
  cmrPolygonToGeoJsonPolygon,
  cmrBoxToGeoJsonPolygon,
  cmrSpatialToGeoJSONGeometry,
  cmrSpatialToStacBbox,
  cmrGranToFeatureGeoJSON,
  cmrGranulesToFeatureCollection
};
