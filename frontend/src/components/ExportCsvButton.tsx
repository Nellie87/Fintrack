import { useState } from "react";
import { apiDownload } from "../api/client";
import { friendlyError } from "../lib/friendlyError";

/** Downloads a portfolio's transactions as CSV from GET /api/portfolios/{id}/transactions/export. */
export function ExportCsvButton({ portfolioId, disabled }: { portfolioId: number; disabled?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const exportCsv = async () => {
    setBusy(true);
    setError(null);
    try {
      await apiDownload(`/api/portfolios/${portfolioId}/transactions/export`, "transactions.csv");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className="btn btn--secondary" onClick={exportCsv} disabled={disabled || busy}>
        {busy ? "Exporting…" : "Export CSV"}
      </button>
      {error && (
        <p className="field__error export-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
