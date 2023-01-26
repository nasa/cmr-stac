import "source-map-support/register";
import serverlessExpress from "@vendia/serverless-express";
import { createApp } from "./app";

const app = createApp();
export const handler = serverlessExpress({ app });
