import { useEffect } from "react";

/** Sets the browser tab title, e.g. "Portfolios · FinTrack". */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = title ? `${title} · FinTrack` : "FinTrack by Finnet Technologies";
  }, [title]);
}
