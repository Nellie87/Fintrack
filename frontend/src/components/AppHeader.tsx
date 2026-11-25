import type { ReactNode } from "react";
import { BrandMark } from "./BrandMark";

type AppHeaderProps = {
  /** Right-hand side, e.g. the signed-in analyst and a log-out button. */
  actions?: ReactNode;
};

/** "FinTrack by Finnet Technologies" brand bar shown on every screen. */
export function AppHeader({ actions }: AppHeaderProps) {
  return (
    <header className="app-header">
      <div className="container app-header__inner">
        <a className="brand" href="/" aria-label="FinTrack by Finnet Technologies, home">
          <BrandMark />
          <span className="brand__text">
            <span className="brand__name">FinTrack</span>
            <span className="brand__by">by Finnet Technologies</span>
          </span>
        </a>
        {actions && <div className="app-header__actions">{actions}</div>}
      </div>
    </header>
  );
}
