import { Navigate, Outlet, useLocation } from "react-router";
import { useAuth } from "./auth-context";

/** Renders child routes only for a logged-in analyst; otherwise sends them to /login and back afterwards. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();

  if (status === "checking") {
    return (
      <p className="page-status" role="status">
        Checking your session…
      </p>
    );
  }
  if (status === "anonymous") {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }
  return <Outlet />;
}

/** The reverse: login/register pages send an already logged-in analyst to their portfolios. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === "authenticated") return <Navigate to="/portfolios" replace />;
  return <Outlet />;
}
