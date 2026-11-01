import type { ErrorRequestHandler } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";

// Express only treats a function as an error handler if it has 4 parameters.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({
      message: "Validation failed",
      errors: z.flattenError(err).fieldErrors,
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ message: err.message });
    return;
  }

  if (err?.type === "entity.parse.failed") {
    res.status(400).json({ message: "Invalid JSON body" });
    return;
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error" });
};