import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";
import { createPost, registerUser, resetDb } from "./helpers.js";

describe("posts", () => {
  let ada: { token: string; id: string };
  let bob: { token: string; id: string };

  beforeEach(async () => {
    await resetDb();
    ada = await registerUser("ada@test.dev", "Ada");
    bob = await registerUser("bob@test.dev", "Bob");
  });

  afterAll(() => prisma.$disconnect());

  it("creates a draft with a slug and lowercased unique tags", async () => {
    const res = await createPost(ada.token, {
      title: "Hello World",
      content: "Body",
      tags: ["Docker", "docker", "Node"],
    });

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe("hello-world");
    expect(res.body.published).toBe(false);
    expect(res.body.author).toEqual({ id: ada.id, name: "Ada" });
    expect(res.body.tags.map((t: { name: string }) => t.name).sort()).toEqual([
      "docker",
      "node",
    ]);
  });

  it("requires a token to create", async () => {
    const res = await request(app)
      .post("/api/v1/posts")
      .send({ title: "x", content: "y" });

    expect(res.status).toBe(401);
  });

  it("gives duplicate titles different slugs", async () => {
    const first = await createPost(ada.token, {
      title: "Same Title",
      content: "a",
    });
    const second = await createPost(ada.token, {
      title: "Same Title",
      content: "b",
    });

    expect(first.body.slug).toBe("same-title");
    expect(second.body.slug).toMatch(/^same-title-/);
  });

  it("hides drafts from the public list and from the slug route", async () => {
    await createPost(ada.token, { title: "Hello World", content: "Body" });

    const list = await request(app).get("/api/v1/posts");
    const bySlug = await request(app).get("/api/v1/posts/hello-world");

    expect(list.body.total).toBe(0);
    expect(bySlug.status).toBe(404);
  });

  it("shows a post publicly once it is published", async () => {
    const created = await createPost(ada.token, {
      title: "Hello World",
      content: "Body",
    });

    await request(app)
      .patch(`/api/v1/posts/${created.body.id}`)
      .set("Authorization", `Bearer ${ada.token}`)
      .send({ published: true });

    const list = await request(app).get("/api/v1/posts");
    const bySlug = await request(app).get("/api/v1/posts/hello-world");

    expect(list.body.total).toBe(1);
    expect(bySlug.status).toBe(200);
    expect(bySlug.body.title).toBe("Hello World");
  });

  it("filters the public list by tag", async () => {
    await createPost(ada.token, {
      title: "Docker post",
      content: "a",
      published: true,
      tags: ["docker"],
    });
    await createPost(ada.token, {
      title: "Aws post",
      content: "b",
      published: true,
      tags: ["aws"],
    });

    const res = await request(app).get("/api/v1/posts?tag=docker");

    expect(res.body.total).toBe(1);
    expect(res.body.items[0].title).toBe("Docker post");
  });

  it("lists only the caller's own posts, drafts included, on /mine", async () => {
    await createPost(ada.token, { title: "Ada draft", content: "a" });
    await createPost(bob.token, { title: "Bob draft", content: "b" });

    const res = await request(app)
      .get("/api/v1/posts/mine")
      .set("Authorization", `Bearer ${ada.token}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].title).toBe("Ada draft");
  });

  it("forbids changing another author's post", async () => {
    const created = await createPost(ada.token, {
      title: "Ada post",
      content: "a",
    });
    const url = `/api/v1/posts/${created.body.id}`;

    const patch = await request(app)
      .patch(url)
      .set("Authorization", `Bearer ${bob.token}`)
      .send({ title: "hacked" });
    const del = await request(app)
      .delete(url)
      .set("Authorization", `Bearer ${bob.token}`);

    expect(patch.status).toBe(403);
    expect(del.status).toBe(403);
  });

  it("rejects an invalid post id", async () => {
    const res = await request(app)
      .delete("/api/v1/posts/abc")
      .set("Authorization", `Bearer ${ada.token}`);

    expect(res.status).toBe(400);
  });

  it("deletes the caller's own post", async () => {
    const created = await createPost(ada.token, {
      title: "Hello World",
      content: "Body",
      published: true,
    });

    const del = await request(app)
      .delete(`/api/v1/posts/${created.body.id}`)
      .set("Authorization", `Bearer ${ada.token}`);
    const after = await request(app).get("/api/v1/posts/hello-world");

    expect(del.status).toBe(204);
    expect(after.status).toBe(404);
  });
});
