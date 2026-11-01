import type { RequestHandler } from "express";
import { HttpError } from "../lib/http-error.js";
import { verifyAccessToken } from "../lib/jwt.js";

export const requireAuth: RequestHandler = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    throw new HttpError(401, "Missing token");
  }

  try {
    res.locals.userId = verifyAccessToken(header.slice(7));
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }

  next();
};