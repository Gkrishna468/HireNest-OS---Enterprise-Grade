import { Request, Response } from "express";
import { AIGateway } from "../services/AIGateway.js";

export default async function aiHandler(
  req: Request,
  res: Response
) {
  try {
    const result = await AIGateway.processChat(req.body);

    return res.json({
      success: true,
      ...result
    });

  } catch (err: any) {

    return res.status(500).json({
      success: false,
      error: err.message
    });

  }
}
