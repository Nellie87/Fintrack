import { db } from "@/lib/db";
import { ApiError, handle, readJson } from "@/lib/errors";
import { hashPassword, signToken, toPublicUser } from "@/lib/auth";
import { registerSchema } from "@/lib/schemas";

export const POST = handle(async (req) => {
  const input = registerSchema.parse(await readJson(req));

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.", [
      { field: "email", message: "This email is already registered." },
    ]);
  }

  const user = await db.user.create({
    data: { name: input.name, email: input.email, passwordHash: await hashPassword(input.password) },
  });

  return Response.json({ token: await signToken(user.id), user: toPublicUser(user) }, { status: 201 });
});
