import { Outlet } from "react-router";
import { useAuth } from "../auth/auth-context";
import { AppHeader } from "./AppHeader";

/** Header + main landmark around every page. */
export function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <AppHeader
        actions={
          user && (
            <>
              <span className="app-header__user">{user.name}</span>
              <button type="button" className="btn btn--danger btn--small" onClick={logout}>
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
