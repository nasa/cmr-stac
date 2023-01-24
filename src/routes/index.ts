import express from "express";

import { makeAsyncHandler } from "../utils";
import {
  validateProvider,
  validateCollection,
  validateStacQuery,
} from "../middleware";

import { rootCatalogHandler, conformanceHandler } from "./rootCatalog";
import { handler as providerCatalog } from "./providerCatalog";
import { handler as providerBrowse } from "./providerBrowse";
import { handler as providerSearch } from "./providerSearch";
import { handler as providerCollection } from "./providerCollection";
import { itemHandler, itemsHandler } from "./items";

const router = express.Router();

router.get("/", makeAsyncHandler(rootCatalogHandler));

// validate providers from here on
router.get("/:providerId", validateProvider, makeAsyncHandler(providerCatalog));
router.get("/:providerId/conformance", validateProvider, conformanceHandler);
router.get(
  "/:providerId/search",
  validateProvider,
  validateStacQuery,
  makeAsyncHandler(providerSearch)
);
router.post(
  "/:providerId/search",
  validateProvider,
  validateStacQuery,
  makeAsyncHandler(providerSearch)
);

router.get(
  "/:providerId/collections",
  validateProvider,
  validateStacQuery,
  makeAsyncHandler(providerBrowse)
);

router.get(
  "/:providerId/collections/:collectionId",
  validateProvider,
  makeAsyncHandler(providerCollection)
);

router.get(
  "/:providerId/collections/:collectionId/items",
  validateProvider,
  validateCollection,
  makeAsyncHandler(itemsHandler)
);

router.get(
  "/:providerId/collections/:collectionId/items/:itemId",
  validateProvider,
  validateCollection,
  makeAsyncHandler(itemHandler)
);

export default router;
