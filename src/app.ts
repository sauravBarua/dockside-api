import express from "express";
import { healthRouter } from "./routes/health.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/v1/health", healthRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});
