import * as sinon from "sinon";
import chai from "chai";
import sinonChai from "sinon-chai";

chai.use(sinonChai);

const { expect } = chai;

import * as gql from "graphql-request";
import { collectionHandler, collectionsHandler, addItemLinkIfPresent } from "../browse";
import { generateSTACCollections } from "../../utils/testUtils";

const sandbox = sinon.createSandbox();

afterEach(() => {
  sandbox.restore();
});

describe("addItemLinkIfPresent", () => {
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
    addItemLinkIfPresent(stacCollection, "https://foo.com/items");
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
    addItemLinkIfPresent(stacCollection, "https://foo.com/items");
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
