/**
 * @jest-environment node
 */

const _ = require('lodash');

const { createRequest } = require('../../util');
const { prepare, format, EXTENSION_TYPES } = require('../../../lib/stac/extension');
const fieldsExtension = require('../../../lib/stac/extensions/fields');
const contextExtension = require('../../../lib/stac/extensions/context');

describe('STAC API Extensions', () => {
  let request;
  const result = {
    type: 'FeatureCollection',
    stac_version: '1.0.0',
    features: [
      {
        type: 'Feature',
        id: 'G1266176677-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266176677-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-01T00:00:00.000Z',
          start_datetime: '1987-07-01T00:00:00.000Z',
          end_datetime: '1987-07-02T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.01.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266176677-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266180610-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266180610-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-02T00:00:00.000Z',
          start_datetime: '1987-07-02T00:00:00.000Z',
          end_datetime: '1987-07-03T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.02.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266180610-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266180632-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266180632-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-03T00:00:00.000Z',
          start_datetime: '1987-07-03T00:00:00.000Z',
          end_datetime: '1987-07-04T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.03.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266180632-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266180519-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266180519-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-04T00:00:00.000Z',
          start_datetime: '1987-07-04T00:00:00.000Z',
          end_datetime: '1987-07-05T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.04.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266180519-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266176599-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266176599-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-05T00:00:00.000Z',
          start_datetime: '1987-07-05T00:00:00.000Z',
          end_datetime: '1987-07-06T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.05.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266176599-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266176788-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266176788-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-06T00:00:00.000Z',
          start_datetime: '1987-07-06T00:00:00.000Z',
          end_datetime: '1987-07-07T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.06.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266176788-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266180454-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266180454-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-07T00:00:00.000Z',
          start_datetime: '1987-07-07T00:00:00.000Z',
          end_datetime: '1987-07-08T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.07.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266180454-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266176581-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266176581-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-08T00:00:00.000Z',
          start_datetime: '1987-07-08T00:00:00.000Z',
          end_datetime: '1987-07-09T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.08.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266176581-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266180600-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266180600-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-09T00:00:00.000Z',
          start_datetime: '1987-07-09T00:00:00.000Z',
          end_datetime: '1987-07-10T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.09.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266180600-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      },
      {
        type: 'Feature',
        id: 'G1266176594-GES_DISC',
        short_name: undefined,
        stac_version: '1.0.0',
        collection: 'C1237113465-GES_DISC',
        geometry: {
          type: 'Polygon',
          coordinates: [
            [
              [
                -180,
                -90
              ],
              [
                180,
                -90
              ],
              [
                180,
                90
              ],
              [
                -180,
                90
              ],
              [
                -180,
                -90
              ]
            ]
          ]
        },
        bbox: [
          -180,
          -90,
          180,
          90
        ],
        links: [
          {
            rel: 'self',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items/G1266176594-GES_DISC'
          },
          {
            rel: 'parent',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC/items'
          },
          {
            rel: 'collection',
            href: 'http://localhost:3000/stac/GES_DISC/collections/C1237113465-GES_DISC'
          },
          {
            rel: 'root',
            href: 'http://localhost:3000/stac/'
          },
          {
            rel: 'provider',
            href: 'http://localhost:3000/stac/GES_DISC'
          }
        ],
        properties: {
          datetime: '1987-07-10T00:00:00.000Z',
          start_datetime: '1987-07-10T00:00:00.000Z',
          end_datetime: '1987-07-11T00:00:00.000Z'
        },
        assets: {
          data: {
            href: 'https://measures.gesdisc.eosdis.nasa.gov/data//GSSTF/GSSTF_NCEP.3/1987/GSSTF_NCEP.3.1987.07.10.he5',
            type: undefined
          },
          metadata: {
            href: 'http://localhost:3003/concepts/G1266176594-GES_DISC.xml',
            type: 'application/xml'
          }
        }
      }
    ],
    links: [
      {
        rel: 'self',
        href: 'http://localhost:3000/stac/GES_DISC/search'
      },
      {
        rel: 'root',
        href: 'http://localhost:3000/stac/'
      },
      {
        rel: 'next',
        href: 'http://localhost:3000/stac/GES_DISC/search?page=2'
      }
    ]
  };

  beforeEach(() => {
    request = createRequest({
      body: '{}',
      params: {
        providerId: 'LPDAAC',
        sortby: '+id',
        fields: {
          include: [
            'id',
            'type',
            'bbox',
            'properties',
            'links',
            'assets'
          ],
          exclude: [
            'geometry'
          ]
        }
      }
    });
  });

  describe('prepare', () => {
    it('should remove all STAC API extensions from the HTTP request', async () => {
      const strippedRequestObject = prepare(request);

      expect(_.hasIn(strippedRequestObject, EXTENSION_TYPES.fields)).toBe(false);
      expect(_.hasIn(strippedRequestObject, 'sortby')).toBe(false);
    });
  });

  describe('format', () => {
    it('should execute the suite of STAC API Extensions', async () => {
      const applyFieldsExtensionSpy = jest.spyOn(fieldsExtension, 'format');
      const applyContextExtensionSpy = jest.spyOn(contextExtension, 'apply');
      format(result, { fields: request.params.fields, context: { searchResult: { granules: [] }, query: {} } });
      expect(applyFieldsExtensionSpy).toHaveBeenCalled();
      expect(applyContextExtensionSpy).toHaveBeenCalled();
    });
  });
});
