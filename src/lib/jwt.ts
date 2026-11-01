import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(userId: string): string {
  return jwt.sign({}, env.JWT_ACCESS_SECRET, {
    algorithm: "HS256",
    subject: userId,
    expiresIn: env.JWT_EXPIRES_IN_SECONDS,
  });
}

export function verifyAccessToken(token: string): string {
  const payload = jwt.verify(token, env.JWT_ACCESS_SECRET, {
    algorithms: ["HS256"],
  });

  if (typeof payload === "string" || !payload.sub) {
    throw new Error("Invalid token payload");
  }

  return payload.sub;
}
