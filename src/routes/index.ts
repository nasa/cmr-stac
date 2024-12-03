import express from "express";

import { collectionHandler, collectionsHandler } from "./browse";
import { healthcheckHandler } from "./healthcheck";
import { multiItemHandler, singleItemHandler } from "./items";
import { providerCatalogHandler } from "./catalog";
import { providerConformanceHandler } from "./providerConformance";
import { rootCatalogHandler } from "./rootCatalog";
import { rootConformanceHandler } from "./conformance";
import { documentationHandler } from "./documentation";
import { searchHandler } from "./search";
import { wrapErrorHandler } from "../utils";

import {
  cacheMiddleware,
  cloudStacMiddleware,
  logFullRequestMiddleware,
  refreshProviderCache,
  validateCollection,
  validateProvider,
  validateStacQuery,
  validateNotAllProvider,
} from "../middleware";

const router = express.Router();

router.use(cloudStacMiddleware, cacheMiddleware, logFullRequestMiddleware);

router.get("/", refreshProviderCache, wrapErrorHandler(rootCatalogHandler));
router.get("/health", wrapErrorHandler(healthcheckHandler));
router.get("/conformance", wrapErrorHandler(rootConformanceHandler));
router.get("/testingdocs/testdoc", wrapErrorHandler(documentationHandler));

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
  .get(
    refreshProviderCache,
    validateNotAllProvider,
    validateProvider,
    validateStacQuery,
    wrapErrorHandler(searchHandler)
  )
  .post(
    refreshProviderCache,
    validateNotAllProvider,
    validateProvider,
    validateStacQuery,
    wrapErrorHandler(searchHandler)
  );

router
  .route("/:providerId/collections")
  .get(
    refreshProviderCache,
    validateProvider,
    validateStacQuery,
    wrapErrorHandler(collectionsHandler)
  )
  .post(
    refreshProviderCache,
    validateProvider,
    validateStacQuery,
    wrapErrorHandler(collectionsHandler)
  );

router.get(
  "/:providerId/collections/:collectionId",
  refreshProviderCache,
  validateNotAllProvider,
  validateProvider,
  validateStacQuery,
  validateCollection,
  wrapErrorHandler(collectionHandler)
);

router.get(
  "/:providerId/collections/:collectionId/items",
  refreshProviderCache,
  validateNotAllProvider,
  validateProvider,
  validateStacQuery,
  validateCollection,
  wrapErrorHandler(multiItemHandler)
);

router.get(
  "/:providerId/collections/:collectionId/items/:itemId",
  refreshProviderCache,
  validateNotAllProvider,
  validateProvider,
  validateStacQuery,
  validateCollection,
  wrapErrorHandler(singleItemHandler)
);

export default router;
