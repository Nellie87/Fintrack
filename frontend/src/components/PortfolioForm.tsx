import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { PortfolioInput } from "../api/types";
import { applyServerErrors } from "../lib/applyServerErrors";
import { TextField } from "./TextField";

const schema = z.object({
  name: z.string().trim().min(1, "Portfolio name is required.").max(100, "Portfolio name must be at most 100 characters."),
  clientName: z.string().trim().min(1, "Client name is required.").max(100, "Client name must be at most 100 characters."),
  baseCurrency: z.enum(["KES", "USD"], { error: "Choose KES or USD." }),
});

type PortfolioFormProps = {
  initial?: PortfolioInput;
  submitLabel: string;
  onSubmit: (values: PortfolioInput) => Promise<unknown>;
  onCancel: () => void;
};

/** Create and edit share this form; the modal around it decides which. */
export function PortfolioForm({ initial, submitLabel, onSubmit, onCancel }: PortfolioFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PortfolioInput>({
    resolver: zodResolver(schema),
    defaultValues: initial ?? { name: "", clientName: "", baseCurrency: "KES" },
  });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setFormError(applyServerErrors(err, setError, ["name", "clientName", "baseCurrency"]));
    }
  });

  return (
    <form className="form" onSubmit={submit} noValidate>
      {formError && (
        <div className="alert alert--error" role="alert">
          {formError}
        </div>
      )}
      <TextField label="Portfolio name" placeholder="e.g. Growth Equity" error={errors.name?.message} {...register("name")} />
      <TextField label="Client name" placeholder="e.g. Acacia Family Trust" error={errors.clientName?.message} {...register("clientName")} />

      <fieldset className="field fieldset">
        <legend className="field__label">Base currency</legend>
        <div className="segmented">
          {(["KES", "USD"] as const).map((c) => (
            <label key={c} className="segmented__option">
              <input type="radio" value={c} {...register("baseCurrency")} />
              <span>{c}</span>
            </label>
          ))}
        </div>
        {errors.baseCurrency && <span className="field__error">{errors.baseCurrency.message}</span>}
      </fieldset>

      <div className="modal__actions">
        <button type="button" className="btn btn--secondary" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </button>
        <button type="submit" className="btn btn--primary" disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
