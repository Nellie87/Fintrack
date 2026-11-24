import { z } from "zod";

/** Request-body schemas. Routes call schema.parse(); a failure becomes a 422 via handle(). */

const email = z
  .string({ error: "Email is required." })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: "Enter a valid email address." }));

export const registerSchema = z.object({
  name: z
    .string({ error: "Name is required." })
    .trim()
    .min(2, { error: "Name must be at least 2 characters." })
    .max(100, { error: "Name must be at most 100 characters." }),
  email,
  password: z
    .string({ error: "Password is required." })
    .min(8, { error: "Password must be at least 8 characters." })
    .max(72, { error: "Password must be at most 72 characters." }), // bcrypt only uses the first 72 bytes
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required." }).min(1, { error: "Password is required." }),
});

/** Used for both POST (create) and PUT (full update) of a portfolio. */
export const portfolioSchema = z.object({
  name: z
    .string({ error: "Portfolio name is required." })
    .trim()
    .min(1, { error: "Portfolio name is required." })
    .max(100, { error: "Portfolio name must be at most 100 characters." }),
  clientName: z
    .string({ error: "Client name is required." })
    .trim()
    .min(1, { error: "Client name is required." })
    .max(100, { error: "Client name must be at most 100 characters." }),
  baseCurrency: z.enum(["KES", "USD"], { error: "Base currency must be KES or USD." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PortfolioInput = z.infer<typeof portfolioSchema>;
