import { useId, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ApiError } from "../api/client";
import type { Currency, Holding, TransactionInput } from "../api/types";
import { applyServerErrors } from "../lib/applyServerErrors";
import { formatNumber } from "../lib/format";
import { TextField } from "./TextField";

/** Common Nairobi Securities Exchange tickers and Treasury bills, offered as suggestions. */
const COMMON_INSTRUMENTS = ["SCOM", "KCB", "EQTY", "EABL", "COOP", "ABSA", "NCBA", "T-BILL-91", "T-BILL-182", "T-BILL-364"];

/** Today's date in the analyst's own timezone, as YYYY-MM-DD. */
const today = () => new Date().toLocaleDateString("en-CA");

// Mirrors the API's rules (backend/src/lib/schemas.ts); the API re-checks everything.
const schema = z.object({
  instrument: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9][A-Z0-9.-]{0,19}$/, "Use a ticker such as SCOM, KCB or T-BILL-91."),
  type: z.enum(["BUY", "SELL"]),
  quantity: z.number({ error: "Enter a quantity." }).positive("Quantity must be greater than 0."),
  unitPrice: z.number({ error: "Enter a unit price." }).positive("Unit price must be greater than 0."),
  tradeDate: z
    .string()
    .min(1, "Choose the trade date.")
    .refine((d) => d <= today(), "Trade date can't be in the future."),
});
type FormValues = z.infer<typeof schema>;

type TransactionFormProps = {
  currency: Currency;
  holdings: Holding[];
  knownInstruments: string[];
  onSubmit: (values: TransactionInput) => Promise<unknown>;
  onCancel: () => void;
};

export function TransactionForm({ currency, holdings, knownInstruments, onSubmit, onCancel }: TransactionFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const listId = useId();

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { instrument: "", type: "BUY", tradeDate: today() },
  });

  // Live values for the "You currently hold…" hint and the submit button label.
  const type = useWatch({ control, name: "type" });
  const instrument = (useWatch({ control, name: "instrument" }) ?? "").trim().toUpperCase();
  const held = holdings.find((h) => h.instrument === instrument)?.netQuantity ?? 0;
  const suggestions = [...new Set([...knownInstruments, ...COMMON_INSTRUMENTS])];

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      const banner = applyServerErrors(err, setError, ["instrument", "type", "quantity", "unitPrice", "tradeDate"]);
      // For an oversell, the field shows "Exceeds holding of 300." and the banner gives the full story with the date.
      setFormError(err instanceof ApiError && err.code === "INSUFFICIENT_HOLDINGS" ? err.message : banner);
    }
  });

  return (
    <form className="form" onSubmit={submit} noValidate>
      {formError && (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      )}

      <fieldset className="field fieldset">
        <legend className="field__label">Type</legend>
        <div className="segmented">
          {(["BUY", "SELL"] as const).map((t) => (
            <label key={t} className="segmented__option">
              <input type="radio" value={t} {...register("type")} />
              <span>{t === "BUY" ? "Buy" : "Sell"}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <TextField
        label="Instrument"
        list={listId}
        autoComplete="off"
        placeholder="e.g. SCOM"
        hint={
          type === "SELL" && instrument
            ? `You currently hold ${formatNumber(held)} ${instrument}.`
            : "NSE ticker or bill, e.g. SCOM, KCB, EQTY or T-BILL-91."
        }
        error={errors.instrument?.message}
        {...register("instrument")}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      <div className="form-row">
        <TextField
          label="Quantity"
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder="e.g. 1000"
          error={errors.quantity?.message}
          {...register("quantity", { valueAsNumber: true })}
        />
        <TextField
          label={`Unit price (${currency})`}
          type="number"
          inputMode="decimal"
          min="0"
          step="any"
          placeholder={currency === "KES" ? "e.g. 17.50" : "e.g. 96.25"}
          error={errors.unitPrice?.message}
          {...register("unitPrice", { valueAsNumber: true })}
        />
      </div>

      <TextField
        label="Trade date"
        type="date"
        max={today()}
        error={errors.tradeDate?.message}
        {...register("tradeDate")}
      />

      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : type === "BUY" ? "Record buy" : "Record sell"}
        </button>
      </div>
    </form>
  );
}
