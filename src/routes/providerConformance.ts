import { Request, Response } from "express";
import { conformance } from "../domains/providers";

export const providerConformanceHandler = (_req: Request, res: Response) =>
  res.json({ conformsTo: conformance });
