import { Request, Response } from "express";

export const rootConformance = ["https://api.stacspec.org/v1.0.0-rc.2/core"];

export const rootConformanceHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json({ conformsTo: rootConformance });
};
