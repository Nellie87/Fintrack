import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "react-router";
import { useAuth } from "../auth/auth-context";
import { TextField } from "../components/TextField";
import { applyServerErrors } from "../lib/applyServerErrors";
import { usePageTitle } from "../lib/usePageTitle";

const DEMO = { email: "demo@fintrack.app", password: "Demo@2026" };

const schema = z.object({
  email: z.string().trim().min(1, "Email is required.").pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Password is required."),
});
type LoginValues = z.infer<typeof schema>;

export function LoginPage() {
  usePageTitle("Log in");
  const { login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(schema), defaultValues: { email: "", password: "" } });

  const onSubmit = handleSubmit(async ({ email, password }) => {
    setFormError(null);
    try {
      // On success GuestRoute redirects to the page the analyst first asked for (or /portfolios).
      await login(email, password);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ["email", "password"]));
    }
  });

  const fillDemo = () => {
    setValue("email", DEMO.email, { shouldValidate: true });
    setValue("password", DEMO.password, { shouldValidate: true });
    setFormError(null);
  };

  return (
    <section className="auth-card card" aria-labelledby="login-title">
      <h1 id="login-title">Log in</h1>
      <p className="auth-card__lead">Track client portfolios, trades and holdings.</p>

      <form className="form" onSubmit={onSubmit} noValidate>
        {formError && (
          <div className="alert alert--error" role="alert">
            {formError}
          </div>
        )}
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
          autoComplete="current-password"
          error={errors.password?.message}
          {...register("password")}
        />
        <button className="btn btn--primary btn--block" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Logging in…" : "Log in"}
        </button>
      </form>

      <div className="auth-card__demo">
        <p>
          Reviewing FinTrack? Use the demo analyst: <strong>{DEMO.email}</strong> / <strong>{DEMO.password}</strong>
        </p>
        <button type="button" className="btn btn--secondary btn--small" onClick={fillDemo}>
          Fill in demo login
        </button>
      </div>

      <p className="auth-card__switch">
        New to FinTrack? <Link to="/register">Create an account</Link>
      </p>
    </section>
  );
}
