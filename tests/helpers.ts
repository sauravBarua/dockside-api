import request from "supertest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

export async function resetDb() {
  if (!process.env.DATABASE_URL?.includes("dockside_test")) {
    throw new Error("Refusing to reset a database that is not dockside_test");
  }
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "users", "posts", "tags" RESTART IDENTITY CASCADE',
  );
}

export async function registerUser(email: string, name = "Test Author") {
  const res = await request(app)
    .post("/api/v1/auth/register")
    .send({ email, name, password: "password123" });

  return { token: res.body.token as string, id: res.body.user.id as string };
}

export function createPost(token: string, body: Record<string, unknown>) {
  return request(app)
    .post("/api/v1/posts")
    .set("Authorization", `Bearer ${token}`)
    .send(body);
}
