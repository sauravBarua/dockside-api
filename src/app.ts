import express from "express";
import { errorHandler } from "./middleware/error-handler.js";
import { authRouter } from "./routes/auth.js";
import { healthRouter } from "./routes/health.js";
import { postsRouter } from "./routes/posts.js";
import { tagsRouter } from "./routes/tags.js";

export const app = express();

app.disable("x-powered-by");
app.use(express.json());

app.use("/api/v1/health", healthRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/posts", postsRouter);
app.use("/api/v1/tags", tagsRouter);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);
