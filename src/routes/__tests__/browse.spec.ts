import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import * as gql from "graphql-request";
import {
  collectionHandler,
  collectionsHandler,
  addItemLinkIfNotPresent,
  generateBaseUrlForCollection,
  generateCollectionResponse,
} from "../browse";
import { generateSTACCollections } from "../../utils/testUtils";

describe("addItemLinkIfNotPresent", () => {
  it("will add an item link if no item link is present", async () => {
    // Create a STACCollection with no item link
    let stacCollection = generateSTACCollections(1)[0];
    // Add a non-item link
    stacCollection.links.push({
      rel: "via",
      href: "https://example.com/foo",
      type: "application/html",
      title: "foo",
    });

    const numberoOfLinks = stacCollection.links.length;
    // Invoke method
    addItemLinkIfNotPresent(stacCollection, "https://foo.com");
    // Observe an addiitonal link in the STAC Collection with rel=items etc.
    expect(stacCollection.links.length).to.equal(numberoOfLinks + 1);
    expect(stacCollection).to.have.deep.property("links", [
      {
        rel: "via",
        href: "https://example.com/foo",
        type: "application/html",
        title: "foo",
      },
      {
        rel: "items",
        href: "https://foo.com/items",
        type: "application/geo+json",
        title: "Collection Items",
      },
    ]);
  });
  it("will not add an item link if an item link is present", async () => {
    // Create a STACCollection with no item link
    let stacCollection = generateSTACCollections(1)[0];

    // Manually add an item link
    stacCollection.links.push({
      rel: "items",
      href: "https://example.com/items",
      type: "application/geo+json",
      title: "Collection Items",
    });
    // Add a non-item link
    stacCollection.links.push({
      rel: "via",
      href: "https://example.com/foo",
      type: "application/html",
      title: "foo",
    });
    const numberoOfLinks = stacCollection.links.length;
    // Invoke method
    addItemLinkIfNotPresent(stacCollection, "https://foo.com/items");
    // Observe no addiitonal link in the STAC Collection and that the item link remains a CMR link
    expect(stacCollection.links.length).to.equal(numberoOfLinks);
    expect(stacCollection).to.have.deep.property("links", [
      {
        rel: "items",
        href: "https://example.com/items",
        type: "application/geo+json",
        title: "Collection Items",
      },
      {
        rel: "via",
        href: "https://example.com/foo",
        type: "application/html",
        title: "foo",
      },
    ]);
  });
});

describe("generateBaseUrlForCollection for stac/ALL", () => {
  it("will use the provider name for an ALL collection result", async () => {
    let stacCollection = generateSTACCollections(1)[0];

    const baseUrl = generateBaseUrlForCollection(
      "http://localhost:3000/stac/ALL/collections/Test%201_1.2",
      stacCollection
    );
    expect(baseUrl).to.equal("http://localhost:3000/stac/PROV1/collections/Test%201_1.2");
  });
  it("will use the same provider name for any other collection result", async () => {
    let stacCollection = generateSTACCollections(1)[0];

    const baseUrl = generateBaseUrlForCollection(
      "http://localhost:3000/stac/PROV1/collections/Test%201_1.2",
      stacCollection
    );
    expect(baseUrl).to.equal("http://localhost:3000/stac/PROV1/collections/Test%201_1.2");
  });
});

describe("generateCollectionResponse for stac/ALL", () => {
  it("will add the correct description if the provider is 'ALL'", async () => {
    let stacCollections = generateSTACCollections(1);
    const baseUrl = "http://localhost:3000/stac/ALL/collections";
    const collectionsResponse = generateCollectionResponse(baseUrl, [], stacCollections);
    expect(collectionsResponse.description).to.equal("All collections provided by CMR");
  });
  it("will add the correct description if the provider is a real provider", async () => {
    let stacCollections = generateSTACCollections(1);
    const baseUrl = "http://localhost:3000/stac/PROV1/collections";
    const collectionsResponse = generateCollectionResponse(baseUrl, [], stacCollections);
    expect(collectionsResponse.description).to.equal("All collections provided by PROV1");
  });
});

describe("generateBaseUrlForCollection for cloudstac/ALL", () => {
  it("will use the provider name for an ALL collection result", async () => {
    let stacCollection = generateSTACCollections(1)[0];

    const baseUrl = generateBaseUrlForCollection(
      "http://localhost:3000/cloudstac/ALL/collections/Test%201_1.2",
      stacCollection
    );
    expect(baseUrl).to.equal("http://localhost:3000/cloudstac/PROV1/collections/Test%201_1.2");
  });
  it("will use the same provider name for any other collection result", async () => {
    let stacCollection = generateSTACCollections(1)[0];

    const baseUrl = generateBaseUrlForCollection(
      "http://localhost:3000/cloudstac/PROV1/collections/Test%201_1.2",
      stacCollection
    );
    expect(baseUrl).to.equal("http://localhost:3000/cloudstac/PROV1/collections/Test%201_1.2");
  });
});

describe("generateCollectionResponse for cloudstac/ALL", () => {
  it("will add the correct description if the provider is 'ALL'", async () => {
    let stacCollections = generateSTACCollections(1);
    const baseUrl = "http://localhost:3000/cloudstac/ALL/collections";
    const collectionsResponse = generateCollectionResponse(baseUrl, [], stacCollections);
    expect(collectionsResponse.description).to.equal("All collections provided by CMR");
  });
  it("will add the correct description if the provider is a real provider", async () => {
    let stacCollections = generateSTACCollections(1);
    const baseUrl = "http://localhost:3000/cloudstac/PROV1/collections";
    const collectionsResponse = generateCollectionResponse(baseUrl, [], stacCollections);
    expect(collectionsResponse.description).to.equal("All collections provided by PROV1");
  });
});
