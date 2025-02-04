import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import express from "express";
import compression from "compression";
import cookieParser from "cookie-parser";
import qs from "qs";

import * as dotenv from "dotenv";
dotenv.config();

import routes from "./routes";
import { notFoundHandler, errorHandler } from "./middleware";

const createApp = () => {
  const app = express();

  // This allows the query parser to parse up to 100 coordinates without adding indices.
  // Anything over 100 would error out because indices are added. See CMR-10296 and
  // https://github.com/ljharb/qs for more details.
  app.set("query parser", function (str: string) {
    return qs.parse(str, { arrayLimit: 100 });
  });

  app.use(compression());
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  if (!process.env.CI) {
    const logger = process.env.IS_LOCAL === "true" ? morgan("dev") : morgan("combined");
    app.use(logger);
  }

  app.use(/\/(cloud)?stac?/, routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
};

export { createApp };
