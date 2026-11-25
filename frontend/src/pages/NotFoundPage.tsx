import { Link } from "react-router";
import { usePageTitle } from "../lib/usePageTitle";

export function NotFoundPage() {
  usePageTitle("Page not found");
  return (
    <section className="page-message">
      <h1>Page not found</h1>
      <p>The page you're looking for doesn't exist or has moved.</p>
      <Link className="btn btn--primary" to="/dashboard">
        Go to dashboard
      </Link>
    </section>
  );
}
