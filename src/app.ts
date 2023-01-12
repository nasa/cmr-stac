import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";

import * as dotenv from "dotenv";
dotenv.config();

import routes from "./routes";
import {
  notFoundHandler,
  errorHandler,
  cloudStacMiddleware,
} from "./middleware";

const createApp = () => {
  const app = express();

  app.use(compression());
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!process.env.CI) {
    const logger =
      process.env.IS_LOCAL === "true" ? morgan("dev") : morgan("combined");
    app.use(logger);
  }

  app.use(/\/(cloud)?stac?/, cloudStacMiddleware, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export { createApp };
