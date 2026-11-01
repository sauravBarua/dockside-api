import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";

export function slugify(text: string): string {
  const slug = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  return slug || "post";
}

export async function uniqueSlug(title: string): Promise<string> {
  const base = slugify(title);
  let slug = base;

  while (
    await prisma.post.findUnique({ where: { slug }, select: { id: true } })
  ) {
    slug = `${base}-${randomBytes(2).toString("hex")}`;
  }

  return slug;
}
