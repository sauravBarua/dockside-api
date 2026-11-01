import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";
import { prisma } from "../lib/prisma.js";
import { uniqueSlug } from "../lib/slug.js";
import { requireAuth } from "../middleware/require-auth.js";

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

const tagNames = z
  .array(
    z
      .string()
      .trim()
      .toLowerCase()
      .min(1)
      .max(30),
  )
  .max(5)
  .transform((names) => [...new Set(names)]);

const createBody = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(200),
  content: z
    .string()
    .trim()
    .min(1)
    .max(20000),
  published: z.boolean().default(false),
  tags: tagNames.default([]),
});

const updateBody = z.object({
  title: z
    .string()
    .trim()
    .min(1)
    .max(200)
    .optional(),
  content: z
    .string()
    .trim()
    .min(1)
    .max(20000)
    .optional(),
  published: z.boolean().optional(),
  tags: tagNames.optional(),
});

const idParams = z.object({ id: z.uuid() });

const postInclude = {
  author: { select: { id: true, name: true } },
  tags: { select: { name: true } },
} as const;

async function ensureTags(names: string[]) {
  for (const name of names) {
    await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
  }
  return names.map((name) => ({ name }));
}

async function assertOwnedPost(id: string, userId: string) {
  const post = await prisma.post.findUnique({
    where: { id },
    select: { authorId: true },
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }
  if (post.authorId !== userId) {
    throw new HttpError(403, "You can only change your own posts");
  }
}

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

// Must stay above "/:slug", otherwise "mine" would be read as a slug.
postsRouter.get("/mine", requireAuth, async (_req, res) => {
  const items = await prisma.post.findMany({
    where: { authorId: res.locals.userId },
    include: postInclude,
    orderBy: { updatedAt: "desc" },
  });

  res.json({ items });
});

postsRouter.get("/:slug", async (req, res) => {
  const { slug } = z.object({ slug: z.string().min(1) }).parse(req.params);

  const post = await prisma.post.findFirst({
    where: { slug, published: true },
    include: postInclude,
  });

  if (!post) {
    throw new HttpError(404, "Post not found");
  }

  res.json(post);
});

postsRouter.post("/", requireAuth, async (req, res) => {
  const body = createBody.parse(req.body);

  const tags = await ensureTags(body.tags);
  const post = await prisma.post.create({
    data: {
      title: body.title,
      content: body.content,
      published: body.published,
      slug: await uniqueSlug(body.title),
      authorId: res.locals.userId,
      tags: { connect: tags },
    },
    include: postInclude,
  });

  res.status(201).json(post);
});

postsRouter.patch("/:id", requireAuth, async (req, res) => {
  const { id } = idParams.parse(req.params);
  const body = updateBody.parse(req.body);

  if (Object.keys(body).length === 0) {
    throw new HttpError(400, "No fields to update");
  }

  await assertOwnedPost(id, res.locals.userId);

  const tags = body.tags ? await ensureTags(body.tags) : undefined;
  const post = await prisma.post.update({
    where: { id },
    data: {
      title: body.title,
      content: body.content,
      published: body.published,
      ...(tags ? { tags: { set: tags } } : {}),
    },
    include: postInclude,
  });

  res.json(post);
});

postsRouter.delete("/:id", requireAuth, async (req, res) => {
  const { id } = idParams.parse(req.params);

  await assertOwnedPost(id, res.locals.userId);
  await prisma.post.delete({ where: { id } });

  res.status(204).send();
});
