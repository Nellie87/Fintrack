/** Password rules, shared by the register form's schema and its live checklist. The API checks the same ones (backend/src/lib/schemas.ts). */
export const PASSWORD_RULES = [
  { id: "length", label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { id: "upper", label: "An uppercase letter (A–Z)", test: (p: string) => /[A-Z]/.test(p) },
  { id: "lower", label: "A lowercase letter (a–z)", test: (p: string) => /[a-z]/.test(p) },
  { id: "number", label: "A number (0–9)", test: (p: string) => /\d/.test(p) },
] as const;
