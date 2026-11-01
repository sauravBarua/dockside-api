import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";

export const postsRouter = Router();

const listQuery = z.object({
  page: z.coerce
    .number()
    .int()
    .min(1)
    .default(1),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(50)
    .default(10),
  tag: z
    .string()
    .trim()
    .min(1)
    .optional(),
});

const postInclude = {
  author: { select: { id: true, name: true } },
  tags: { select: { name: true } },
} as const;

postsRouter.get("/", async (req, res) => {
  const { page, limit, tag } = listQuery.parse(req.query);

  const where = {
    published: true,
    ...(tag ? { tags: { some: { name: tag } } } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      include: postInclude,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.post.count({ where }),
  ]);

  res.json({ items, page, limit, total });
});

postsRouter.get("/:slug", async (req, res) => {
  const post = await prisma.post.findFirst({
    where: { slug: req.params.slug, published: true },
    include: postInclude,
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  res.json(post);
});
