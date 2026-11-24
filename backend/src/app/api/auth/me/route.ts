import { handle } from "@/lib/errors";
import { requireUser } from "@/lib/auth";

export const GET = handle(async (req) => Response.json(await requireUser(req)));
