import { Request, Response } from "express";

export const rootConformance = ["https://api.stacspec.org/v1.0.0-rc.2/core"];

export const rootConformanceHandler = (_req: Request, res: Response) =>
  res.json({ conformsTo: rootConformance });
