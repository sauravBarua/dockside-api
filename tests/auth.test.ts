import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { registerUser, resetDb } from "./helpers.js";

const credentials = {
  email: "ada@test.dev",
  name: "Ada",
  password: "password123",
};

describe("auth", () => {
  beforeEach(resetDb);
  afterAll(() => prisma.$disconnect());

  it("registers a user and returns a token without the password hash", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(credentials);

    expect(res.status).toBe(201);
    expect(res.body.token).toEqual(expect.any(String));
    expect(res.body.user.email).toBe("ada@test.dev");
    expect(JSON.stringify(res.body)).not.toContain("passwordHash");
  });

  it("rejects a duplicate email", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(credentials);
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send(credentials);

    expect(res.status).toBe(409);
  });

  it("rejects an invalid register body", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ email: "bad", name: "", password: "short" });

    expect(res.status).toBe(400);
    expect(Object.keys(res.body.errors)).toEqual(
      expect.arrayContaining(["email", "name", "password"]),
    );
  });

  it("logs in with the right password", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(credentials);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: credentials.password });

    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it("rejects a wrong password", async () => {
    await request(app)
      .post("/api/v1/auth/register")
      .send(credentials);
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: credentials.email, password: "wrong-password" });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid email or password");
  });

  it("requires a token for /me", async () => {
    const res = await request(app).get("/api/v1/auth/me");

    expect(res.status).toBe(401);
  });

  it("returns the current user for /me", async () => {
    const { token } = await registerUser("ada@test.dev", "Ada");
    const res = await request(app)
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("ada@test.dev");
    expect(res.body).not.toHaveProperty("passwordHash");
  });
});
