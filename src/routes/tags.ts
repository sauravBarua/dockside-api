import { Router } from "express";
import { prisma } from "../lib/prisma.js";

export const tagsRouter = Router();

tagsRouter.get("/", async (_req, res) => {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: {
      name: true,
      _count: { select: { posts: { where: { published: true } } } },
    },
  });

  res.json(
    tags.map((tag) => ({ name: tag.name, postCount: tag._count.posts })),
  );
});
