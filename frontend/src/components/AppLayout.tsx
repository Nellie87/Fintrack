import { NavLink, Outlet } from "react-router";
import { useAuth } from "../auth/auth-context";
import { useToast } from "../lib/toast-context";
import { AppHeader } from "./AppHeader";

/** Header (with main navigation once logged in) + main landmark around every page. */
export function AppLayout() {
  const { user, logout } = useAuth();
  const toast = useToast();

  const logOut = () => {
    logout();
    toast.info("You've logged out.");
  };

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader
        nav={
          user && (
            <nav className="main-nav" aria-label="Main">
              <NavLink to="/dashboard" className="main-nav__link">
                Dashboard
              </NavLink>
              <NavLink to="/portfolios" className="main-nav__link">
                Portfolios
              </NavLink>
            </nav>
          )
        }
        actions={
          user && (
            <>
              <span className="app-header__user">{user.name}</span>
              <button type="button" className="btn btn--danger btn--small" onClick={logOut}>
                Log out
              </button>
            </>
          )
        }
      />
      <main id="main" className="container page">
        <Outlet />
      </main>
    </>
  );
}
