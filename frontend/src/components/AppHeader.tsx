import type { ReactNode } from "react";
import { Link } from "react-router";
import { BrandMark } from "./BrandMark";
import { ThemeToggle } from "./ThemeToggle";

type AppHeaderProps = {
  /** Main navigation, shown once logged in. */
  nav?: ReactNode;
  /** Right-hand side, e.g. the signed-in analyst and a log-out button. */
  actions?: ReactNode;
};

/** "FinTrack by Finnet Technologies" brand bar shown on every screen. */
export function AppHeader({ nav, actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <Link className="brand" to="/" aria-label="FinTrack by Finnet Technologies, home">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">FinTrack</span>
            <span className="brand__by">by Finnet Technologies</span>
          </span>
        </Link>
        {nav}
        <div className="app-header__actions">
          <ThemeToggle />
          {actions}
        </div>
      </div>
    </header>
  );
}
