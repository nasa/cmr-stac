import { STACCollection } from "../@types/StacCollection";
import { STACItem } from "../@types/StacItem";
import { Granule, Collection } from "../models/GraphQLModels";

export const generateSTACCollections = (quantity: number) => {
  const mockCollections: STACCollection[] = [];

  for (let i = 0; i < quantity; i++) {
    mockCollections.push({
      id: `mock_collection_${i}.v1`,
      stac_version: "1.0.0",
      type: "Collection",
      description: "a description",
      license: "NASA_OPEN_SOURCE_AGREEMENT",
      extent: {
        spatial: {
          bbox: [[-180, -90, 180, 90]],
        },
        temporal: {
          interval: [["2021-01-01T17:00:00Z", null]],
        },
      },
      links: [],
    } as STACCollection);
  }

  return mockCollections;
};

export const generateSTACItems = (
  collection: string,
  quantity: number,
  opts: any = {}
): STACItem[] => {
  const mockItems: STACItem[] = [];

  const offset = opts.offset ?? 0;
  const provider = opts.provider ?? "TEST_PROV";
  const root = (opts.root = "https://test/stac/");

  for (let i = 0; i < quantity; i++) {
    const id = `mock_item_${i + offset}`;

    mockItems.push({
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
    } as STACItem);
  }

  return mockItems;
};

const baseGranule: Granule = {
  title: "test_title",
  conceptId: "G123456789-TEST_PROV",
  collectionConceptId: "C9876543210-TEST_PROV",
  cloudCover: null,
  lines: null,
  boxes: null,
  polygons: null,
  points: null,
  links: [
    {
      rel: "http://esipfed.org/ns/fedsearch/1.1/data#",
      type: "application/x-hdfeos",
      hreflang: "en-US",
      href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.hdf",
    },
    {
      rel: "http://esipfed.org/ns/fedsearch/1.1/browse#",
      type: "image/jpeg",
      title: "(BROWSE)",
      hreflang: "en-US",
      href: "ftp://e4ftl01.cr.usgs.gov/WORKING/BRWS/Browse.001/2009.10.03/BROWSE.MCD43A4.A2009257.h29v03.005.2009276005913.1.jpg",
    },
    {
      rel: "http://esipfed.org/ns/fedsearch/1.1/metadata#",
      type: "text/xml",
      title: "(METADATA)",
      hreflang: "en-US",
      href: "ftp://e4ftl01.cr.usgs.gov/MODIS_Composites/MOTA/MCD43A4.005/2009.09.14/MCD43A4.A2009257.h29v03.005.2009276045828.hdf.xml",
    },
    {
      inherited: true,
      rel: "http://esipfed.org/ns/fedsearch/1.1/documentation#",
      hreflang: "en-US",
      href: "http://lpdaac.usgs.gov/modis/dataprod.html",
    },
  ],
  timeStart: "2009-09-14T00:00:00.000Z",
  timeEnd: "2010-09-14T00:00:00.000Z",
};

export const generateGranules = (
  quantity: number,
  opts: any = {}
): Granule[] => {
  const mockGranules: Granule[] = [];

  const provider = opts.provider ?? "TEST_PROV";

  for (let i = 0; i < quantity; i++) {
    mockGranules.push({
      ...baseGranule,
      conceptId: `G00000000${i}-${provider}`,
    } as Granule);
  }

  return mockGranules;
};

export const generateCollections = (
  quantity: number,
  opts: any = {}
): Collection[] => {
  const mockCollections: Collection[] = [];
  const provider = opts.provider ?? "TEST_PROV";

  for (let i = 0; i < quantity; i++) {
    mockCollections.push({
      conceptId: `C00000000${i}-${provider}`,
      provider,
      cloudHosted: null,
      summary: "summary",
      description: "this is the abstract but aliased as description",
      title: "mock_coll",
      shortName: `mock_coll_${i}`,
      version: "1",
      boxes: null,
      lines: null,
      polygons: null,
      points: null,
      timeStart: "2020-01-01T00:00:00.000Z",
      timeEnd: "2021-01-01T00:00:00.000Z",
      useConstraints: {
        description: "not-provided",
      },
      relatedUrls: [],
    } as Collection);
  }
  return mockCollections;
};
