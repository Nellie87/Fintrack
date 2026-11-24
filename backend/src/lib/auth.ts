import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";
import { ApiError } from "./errors";

const BCRYPT_ROUNDS = 10;

export type PublicUser = { id: number; name: string; email: string };

/** Strips the password hash before a user leaves the API. */
export const toPublicUser = (u: { id: number; name: string; email: string }): PublicUser => ({
  id: u.id,
  name: u.name,
  email: u.email,
});

export const hashPassword = (plain: string) => bcrypt.hash(plain, BCRYPT_ROUNDS);
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash);

function secretKey() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET is not set");
  return new TextEncoder().encode(secret);
}

/** Signs a token whose subject is the user id. */
export function signToken(userId: number) {
  return new SignJWT()
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? "8h")
    .sign(secretKey());
}

const unauthorized = () =>
  new ApiError(401, "UNAUTHORIZED", "Missing or invalid token. Please log in again.");

/**
 * Reads "Authorization: Bearer <jwt>", verifies it and loads the user.
 * Throws 401 for a missing, expired or tampered token, or a user that no longer exists.
 */
export async function requireUser(req: Request): Promise<PublicUser> {
  const header = req.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) throw unauthorized();

  let userId: number;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    userId = Number(payload.sub);
  } catch {
    throw unauthorized();
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw unauthorized();
  return toPublicUser(user);
}
