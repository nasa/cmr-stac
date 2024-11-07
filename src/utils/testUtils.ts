import { faker } from "@faker-js/faker";
import { STACCollection } from "../@types/StacCollection";
import { STACItem } from "../@types/StacItem";
import { Granule, Collection, RelatedUrlType, UrlContentType } from "../models/GraphQLModels";

export const generateSTACCollections = (quantity: number) => {
  return Array(quantity)
    .fill(undefined)
    .map(() => {
      return {
        id: "TEST_COLLECTION",
        title: faker.animal.cat(),
        stac_version: "1.0.0",
        type: "Collection",
        description: faker.hacker.phrase(),
        license: "proprietary",
        providers: [{
          name: "PROV1",
          roles: ["producer"]
        }],
        extent: {
          spatial: {
            bbox: [
              [
                faker.datatype.number({ min: -180, max: 0 }),
                faker.datatype.number({ min: -90, max: 0 }),
                faker.datatype.number({ min: 0, max: 180 }),
                faker.datatype.number({ min: 0, max: 90 }),
              ],
            ],
          },
          temporal: {
            interval: [
              [
                faker.date.past().toISOString(),
                Math.random() > 0.5 ? null : faker.date.future().toISOString(),
              ],
            ],
          },
        },
        links: [],
      } as STACCollection;
    });
};

export const generateSTACItems = (
  collection: string,
  quantity: number,
  opts: {
    provider?: string;
    root?: string;
  } = {}
): STACItem[] => {
  const provider = opts.provider ?? "TEST";
  const root = opts.root ?? "https://localhost:3000/stac/";

  return Array(quantity)
    .fill(undefined)
    .map(() => {
      const id = faker.random.words(5).replace(/\s+/gi, "_");
      return {
        id,
        type: "Feature",
        stac_version: "1.0.0",
        collection,
        links: [
          {
            rel: "self",
            href: `${root}${provider}/collections/${collection}/items/${id}`,
          },
          {
            rel: "parent",
            href: `${root}${provider}/collections/${collection}`,
          },
        ],
        assets: {},
        properties: {},
        geometry: {
          coordinates: [
            [
              [-15.982682390462173, 42.24843416342486],
              [-15.982682390462173, -2.914031510390572],
              [36.131315758569116, -2.914031510390572],
              [36.131315758569116, 42.24843416342486],
              [-15.982682390462173, 42.24843416342486],
            ],
          ],
          type: "Polygon",
        },
        bbox: [-15.98, -2.91, 36.13, 42.2],
      } as STACItem;
    });
};

const baseGranule: Granule = {
  title: "test_title",
  conceptId: "G123456789-TEST_PROV",
  collection: null,
  cloudCover: null,
  lines: null,
  boxes: null,
  polygons: null,
  points: null,
  timeStart: "2009-09-14T00:00:00.000Z",
  timeEnd: "2010-09-14T00:00:00.000Z",
  relatedUrls: [
    {
      urlContentType: UrlContentType.DISTRIBUTION_URL,
      url: "ftp://e4ftl014.cr.usgs.gov/MODIS_Composites/MOTA/.B09.tif",
      description: "Browse image for Earthdata Search",
      type: RelatedUrlType.GET_DATA,
    },
    {
      urlContentType: UrlContentType.DISTRIBUTION_URL,
      url: "ftp://e4ftl015/ExampleBadUrl",
      description: "Example of bad url data",
      type: RelatedUrlType.GET_DATA,
    },
    {
      urlContentType: UrlContentType.PUBLICATION_URL,
      url: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.hdf.xml",
      description: "metadata",
      type: RelatedUrlType.DATA_SET_LANDING_PAGE,
    },
    {
      urlContentType: UrlContentType.VISUALIZATION_URL,
      url: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.vinr.img",
      description: "Browse image for Earthdata Search",
      type: RelatedUrlType.THUMBNAIL,
    },
    {
      urlContentType: UrlContentType.VISUALIZATION_URL,
      url: "ftp://e4ftl012/ExampleBadUrl",
      description: "Browse image for Earthdata Search",
      type: RelatedUrlType.THUMBNAIL,
    },
  ],
};

export const generateGranules = (
  quantity: number,
  opts: {
    collection?: {
      entryId: string;
      version: string;
      conceptId: string;
    };
    provider?: string;
  } = {}
): Granule[] => {
  return Array(quantity)
    .fill(undefined)
    .map((_granule, idx) => {
      return {
        ...baseGranule,
        conceptId: `G00000000${idx}-${opts?.provider ?? "TEST_PROV"}`,
        collection: {
          conceptId: opts?.collection?.conceptId ?? "C123456789-TEST_PROV",
          entryId: "TEST_COLLECTION_1",
        },
        title: faker.random.words(8).replace(/\s+/gi, "_"),
      } as Granule;
    });
};

/**
 * Generate some QUANTITY of collection responses.
 */
export const generateCollections = (
  quantity: number,
  opts: { provider?: string } = {}
): Collection[] => {
  const provider = opts?.provider ?? "TEST_PROV";

  return Array(quantity)
    .fill(undefined)
    .map((_collection, idx) => {
      return {
        conceptId: `C0000000${idx}-${provider}`,
        provider,
        summary: faker.lorem.paragraph(),
        description: "this is the abstract but aliased as description",
        title: "mock_coll",
        entryId: faker.random.words(4).replace(/\s+/, "_"),
        boxes: null,
        lines: null,
        polygons: null,
        points: null,
        timeStart: faker.date.past().toISOString(),
        timeEnd: faker.date.future().toISOString(),
        useConstraints: null,
        directDistributionInformation: null,
        relatedUrls: [],
        platforms: [
          {
            type: faker.random.words(),
            shortName: faker.random.words(4),
            longName: faker.random.words(4),
            instruments: [
              {
                shortName: faker.random.words(4),
                longName: faker.random.words(4),
              },
            ],
          },
        ],
        scienceKeywords: [
          {
            category: "EARTH SCIENCE",
            topic: "LAND SURFACE",
            term: "TOPOGRAPHY",
            variableLevel1: "TERRAIN ELEVATION",
          },
        ],
      } as Collection;
    });
};
