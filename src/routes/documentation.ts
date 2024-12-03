import { Request, Response } from "express";
import * as path from "path";

export const documentationHandler = async (_req: Request, res: Response) => {
  console.log('🚀 ~ file: documentation.ts:6 ~ path.resolve("docs/index/index.html"):', path.resolve("docs/index/index.html"))
  res.sendFile(path.resolve("docs/index/index.html"));
};
