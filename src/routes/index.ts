import express from "express";

import { rootCatalogHandler } from "./rootCatalog";
import { rootConformanceHandler } from "./conformance";
import { healthcheckHandler } from "./healthcheck";

import { searchHandler } from "./search";
import { providerCatalogHandler } from "./catalog";
import { collectionHandler, collectionsHandler } from "./browse";
import { multiItemHandler, singleItemHandler } from "./items";

import {
  refreshProviderCache,
  validateProvider,
  validateStacQuery,
  logFullRequestMiddleware,
  cloudStacMiddleware,
  cacheMiddleware,
  validateCollection,
} from "../middleware";

import { wrapErrorHandler } from "../utils";
import { providerConformanceHandler } from "./providerConformance";

const router = express.Router();

router.use(cloudStacMiddleware, cacheMiddleware, logFullRequestMiddleware);

router.get("/", refreshProviderCache, wrapErrorHandler(rootCatalogHandler));
router.get("/health", wrapErrorHandler(healthcheckHandler));
router.get("/conformance", wrapErrorHandler(rootConformanceHandler));

router.get(
  "/:providerId",
  refreshProviderCache,
  validateProvider,
  wrapErrorHandler(providerCatalogHandler)
);
router.get(
  "/:providerId/conformance",
  refreshProviderCache,
  validateProvider,
  wrapErrorHandler(providerConformanceHandler)
);

router
  .route("/:providerId/search")
  .get(refreshProviderCache, validateProvider, validateStacQuery, wrapErrorHandler(searchHandler))
  .post(refreshProviderCache, validateProvider, validateStacQuery, wrapErrorHandler(searchHandler));

router.get(
  "/:providerId/collections",
  refreshProviderCache,
  validateProvider,
  validateStacQuery,
  wrapErrorHandler(collectionsHandler)
);

router.get(
  "/:providerId/collections/:collectionId",
  refreshProviderCache,
  validateProvider,
  validateStacQuery,
  validateCollection,
  wrapErrorHandler(collectionHandler)
);

router.get(
  "/:providerId/collections/:collectionId/items",
  refreshProviderCache,
  validateProvider,
  validateStacQuery,
  validateCollection,
  wrapErrorHandler(multiItemHandler)
);

router.get(
  "/:providerId/collections/:collectionId/items/:itemId",
  refreshProviderCache,
  validateProvider,
  validateStacQuery,
  validateCollection,
  wrapErrorHandler(singleItemHandler)
);

export default router;
