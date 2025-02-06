import "source-map-support/register";
import serverlessExpress from "@vendia/serverless-express";
import { createApp } from "./app";

const app = createApp();
const handler = serverlessExpress({ app });
export default handler;
