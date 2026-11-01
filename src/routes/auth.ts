import { compare, hash } from "bcryptjs";
import { Router } from "express";
import { z } from "zod";
import { HttpError } from "../lib/http-error.js";
import { signAccessToken } from "../lib/jwt.js";
import { prisma } from "../lib/prisma.js";
import { requireAuth } from "../middleware/require-auth.js";

export const authRouter = Router();

const email = z.email().transform((value) => value.toLowerCase());

const registerBody = z.object({
  email,
  name: z
    .string()
    .trim()
    .min(1)
    .max(100),
  // bcrypt only uses the first 72 bytes, so longer passwords are rejected.
  password: z
    .string()
    .min(8)
    .max(72),
});

const loginBody = z.object({
  email,
  password: z
    .string()
    .min(1)
    .max(72),
});

authRouter.post("/register", async (req, res) => {
  const body = registerBody.parse(req.body);

  const existing = await prisma.user.findUnique({
    where: { email: body.email },
  });
  if (existing) {
    throw new HttpError(409, "Email already registered");
  }

  const user = await prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      passwordHash: await hash(body.password, 10),
    },
    select: { id: true, email: true, name: true },
  });

  res.status(201).json({ token: signAccessToken(user.id), user });
});

authRouter.post("/login", async (req, res) => {
  const body = loginBody.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  const valid = user ? await compare(body.password, user.passwordHash) : false;

  if (!user || !valid) {
    throw new HttpError(401, "Invalid email or password");
  }

  res.json({
    token: signAccessToken(user.id),
    user: { id: user.id, email: user.email, name: user.name },
  });
});

authRouter.get("/me", requireAuth, async (_req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: res.locals.userId },
    select: { id: true, email: true, name: true, createdAt: true },
  });

  if (!user) {
    throw new HttpError(401, "Invalid or expired token");
  }

  res.json(user);
});
