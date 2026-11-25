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
    .max(72, { error: "Password must be at most 72 characters." }) // bcrypt only uses the first 72 bytes
    .regex(/[A-Z]/, { error: "Password must include an uppercase letter." })
    .regex(/[a-z]/, { error: "Password must include a lowercase letter." })
    .regex(/\d/, { error: "Password must include a number." }),
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

/** Latest allowed trade date: tomorrow (UTC), so "today" works in every timezone, including EAT. */
const latestTradeDate = () => new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export const transactionSchema = z.object({
  instrument: z
    .string({ error: "Instrument is required." })
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9.-]{0,19}$/, {
      error: "Instrument must be a ticker such as SCOM, KCB or T-BILL-91.",
    }),
  type: z.enum(["BUY", "SELL"], { error: "Type must be BUY or SELL." }),
  quantity: z
    .number({ error: "Quantity must be a number." })
    .positive({ error: "Quantity must be greater than 0." })
    .max(1e12, { error: "Quantity is too large." }),
  unitPrice: z
    .number({ error: "Unit price must be a number." })
    .positive({ error: "Unit price must be greater than 0." })
    .max(1e12, { error: "Unit price is too large." }),
  tradeDate: z.iso
    .date({ error: "Trade date must be a date in YYYY-MM-DD format." })
    .refine((d) => d <= latestTradeDate(), { error: "Trade date cannot be in the future." }),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type PortfolioInput = z.infer<typeof portfolioSchema>;
