import { hash } from "bcryptjs";
import { env } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";

const DEV_PASSWORD = "password123";

const users = [
  { email: "ada@dockside.dev", name: "Ada Author" },
  { email: "linus@dockside.dev", name: "Linus Writer" },
];

const tagNames = ["docker", "nginx", "aws"];

const posts = [
  {
    title: "Why Docker for a tiny app",
    slug: "why-docker-for-a-tiny-app",
    content:
      "Containers make the dev machine and the server behave the same way.",
    published: true,
    authorEmail: "ada@dockside.dev",
    tags: ["docker"],
  },
  {
    title: "Nginx as a reverse proxy",
    slug: "nginx-as-a-reverse-proxy",
    content:
      "Nginx listens on port 80 and forwards requests to the containers on localhost.",
    published: true,
    authorEmail: "ada@dockside.dev",
    tags: ["nginx", "docker"],
  },
  {
    title: "Launching an EC2 instance",
    slug: "launching-an-ec2-instance",
    content:
      "Pick Ubuntu, open ports 22, 80 and 443, and attach an Elastic IP.",
    published: true,
    authorEmail: "linus@dockside.dev",
    tags: ["aws"],
  },
  {
    title: "Draft: CI/CD with GitHub Actions",
    slug: "draft-ci-cd-with-github-actions",
    content: "Work in progress: build, push the image, then deploy over SSH.",
    published: false,
    authorEmail: "linus@dockside.dev",
    tags: ["aws", "docker"],
  },
];

async function main() {
  if (env.NODE_ENV === "production") {
    throw new Error("Refusing to seed in production");
  }

  const passwordHash = await hash(DEV_PASSWORD, 10);

  for (const user of users) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, passwordHash },
    });
  }

  for (const name of tagNames) {
    await prisma.tag.upsert({ where: { name }, update: {}, create: { name } });
  }

  for (const post of posts) {
    await prisma.post.upsert({
      where: { slug: post.slug },
      update: {},
      create: {
        title: post.title,
        slug: post.slug,
        content: post.content,
        published: post.published,
        author: { connect: { email: post.authorEmail } },
        tags: { connect: post.tags.map((name) => ({ name })) },
      },
    });
  }

  const [userCount, tagCount, postCount] = await Promise.all([
    prisma.user.count(),
    prisma.tag.count(),
    prisma.post.count(),
  ]);
  console.log(
    `Seeded: ${userCount} users, ${tagCount} tags, ${postCount} posts`,
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
