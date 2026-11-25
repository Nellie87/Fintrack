import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { useAuth } from "../auth/auth-context";
import { TextField } from "../components/TextField";
import { applyServerErrors } from "../lib/applyServerErrors";
import { usePageTitle } from "../lib/usePageTitle";

// Same rules as the API (backend/src/lib/schemas.ts), so most mistakes are caught before a request.
const schema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Name must be at least 2 characters.")
      .max(100, "Name must be at most 100 characters."),
    email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters.")
      .max(72, "Password must be at most 72 characters."),
    confirmPassword: z.string().min(1, "Please confirm your password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match.",
  });
type RegisterValues = z.infer<typeof schema>;

export function RegisterPage() {
  usePageTitle("Create account");
  const { register: createAccount } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: "", email: "", password: "", confirmPassword: "" },
  });

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    setFormError(null);
    try {
      // On success GuestRoute redirects to /portfolios.
      await createAccount(name, email, password);
    } catch (err) {
      // e.g. 409 EMAIL_TAKEN arrives with details for the "email" field.
      setFormError(applyServerErrors(err, setError, ["name", "email", "password"]));
    }
  });

  return (
    <section className="auth-card card" aria-labelledby="register-title">
      <h1 id="register-title">Create your account</h1>
      <p className="auth-card__lead">Analysts only see the portfolios they create.</p>

      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}
        <TextField label="Full name" autoComplete="name" error={errors.name?.message} {...register("name")} />
        <TextField
          label="Email"
          type="email"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />
        <TextField
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 8 characters."
          error={errors.password?.message}
          {...register("password")}
        />
        <TextField
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />
        <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="auth-card__switch">
        Already have an account? <Link to="/login">Log in</Link>
      </p>
    </section>
  );
}
