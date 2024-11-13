import { Request, Response } from "express";
import axios from "axios";

const CMR_LB_URL = process.env.CMR_LB_URL;
const CMR_INGEST_HEALTH = `${CMR_LB_URL}/ingest/health`;
const CMR_SEARCH_HEALTH = `${CMR_LB_URL}/search/health`;

export const healthcheckHandler = async (_req: Request, res: Response) => {
  console.debug(`GET ${CMR_INGEST_HEALTH}`);
  const { status: ingestStatus } = await axios.get(CMR_INGEST_HEALTH);
  console.debug(`GET ${CMR_SEARCH_HEALTH}`);
  const { status: searchStatus } = await axios.get(CMR_SEARCH_HEALTH);

  if ([ingestStatus, searchStatus].every((status) => status === 200)) {
    res.json({ message: "healthy" });
  } else {
    res.status(503).json({ message: "unhealthy" });
  }
};
