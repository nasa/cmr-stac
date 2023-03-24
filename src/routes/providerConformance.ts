import { Request, Response } from "express";
import { conformance } from "../domains/providers";

export const providerConformanceHandler = async (_req: Request, res: Response): Promise<void> => {
  res.json({ conformsTo: conformance });
};
