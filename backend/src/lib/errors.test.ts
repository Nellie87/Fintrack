import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError, handle, parseId, readJson } from "./errors";

/** Runs a handler through handle() and returns the status plus parsed JSON body. */
async function run(fn: () => Promise<Response>) {
  const res = await handle(fn)(new Request("http://test.local"), {});
  return { status: res.status, body: await res.json() };
}

describe("handle(): one JSON error shape for every failure", () => {
  it("passes successful responses through untouched", async () => {
    const { status, body } = await run(async () => Response.json({ ok: true }, { status: 201 }));
    expect(status).toBe(201);
    expect(body).toEqual({ ok: true });
  });

  it("returns an ApiError's own status, code, message and details", async () => {
    const { status, body } = await run(async () => {
      throw new ApiError(409, "EMAIL_TAKEN", "An account with this email already exists.", [
        { field: "email", message: "This email is already registered." },
      ]);
    });
    expect(status).toBe(409);
    expect(body).toEqual({
      error: {
        code: "EMAIL_TAKEN",
        message: "An account with this email already exists.",
        details: [{ field: "email", message: "This email is already registered." }],
      },
    });
  });

  it("turns a Zod failure into 422 VALIDATION_ERROR with one detail per field", async () => {
    const { status, body } = await run(async () => {
      z.object({ quantity: z.number().positive({ error: "Quantity must be greater than 0." }) }).parse({ quantity: -5 });
      return Response.json({});
    });
    expect(status).toBe(422);
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(body.error.details).toEqual([{ field: "quantity", message: "Quantity must be greater than 0." }]);
  });

  it("maps a serialization conflict (Prisma P2034) to 409 CONFLICT", async () => {
    const { status, body } = await run(async () => {
      throw Object.assign(new Error("write conflict"), { code: "P2034" });
    });
    expect(status).toBe(409);
    expect(body.error.code).toBe("CONFLICT");
  });

  it("hides unexpected errors behind a generic 500 without leaking details", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const { status, body } = await run(async () => {
      throw new Error("connection string postgresql://secret@host");
    });
    expect(status).toBe(500);
    expect(body).toEqual({ error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." } });
    expect(JSON.stringify(body)).not.toContain("secret");
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("request helpers", () => {
  it("readJson rejects malformed JSON with 400 BAD_REQUEST", async () => {
    const req = new Request("http://test.local", { method: "POST", body: "{oops" });
    await expect(readJson(req)).rejects.toMatchObject({ status: 400, code: "BAD_REQUEST" });
  });

  it("parseId accepts positive integers and treats anything else as not found", () => {
    expect(parseId("42", "Portfolio")).toBe(42);
    for (const bad of ["abc", "0", "-3", "1.5", ""]) {
      expect(() => parseId(bad, "Portfolio")).toThrow(expect.objectContaining({ status: 404, code: "NOT_FOUND" }));
    }
  });
});
