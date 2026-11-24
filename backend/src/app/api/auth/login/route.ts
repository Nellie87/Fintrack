import { db } from "@/lib/db";
import { ApiError, handle, readJson } from "@/lib/errors";
import { signToken, toPublicUser, verifyPassword } from "@/lib/auth";
import { loginSchema } from "@/lib/schemas";

export const POST = handle(async (req) => {
  const input = loginSchema.parse(await readJson(req));

  const user = await db.user.findUnique({ where: { email: input.email } });
  const valid = user ? await verifyPassword(input.password, user.passwordHash) : false;

  // Same message for "no such email" and "wrong password", so the API
  // doesn't reveal which emails have accounts.
  if (!user || !valid) {
    throw new ApiError(401, "UNAUTHORIZED", "Incorrect email or password.");
  }

  return Response.json({ token: await signToken(user.id), user: toPublicUser(user) });
});
