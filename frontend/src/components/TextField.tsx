import { forwardRef, useId, type InputHTMLAttributes } from "react";
import { RequiredMark } from "./RequiredMark";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: string;
  /** id of extra help rendered outside the field (e.g. a live checklist), announced with the hint and error. */
  describedById?: string;
};

/**
 * Labelled input. The label is always visible (never placeholder-only), and the
 * hint/error are linked with aria-describedby so screen readers announce them.
 */
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(function TextField(
  { label, error, hint, describedById, id, className, ...inputProps },
  ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hintId = hint ? `${inputId}-hint` : undefined;
  const errorId = error ? `${inputId}-error` : undefined;
  const describedBy = [hintId, describedById, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={["field", className].filter(Boolean).join(" ")}>
      <label className="field__label" htmlFor={inputId}>
        {label}
        {inputProps.required && <RequiredMark />}
      </label>
      <input
        ref={ref}
        id={inputId}
        className="field__input"
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        {...inputProps}
      />
      {hint && (
        <span id={hintId} className="field__hint">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="field__error">
          {error}
        </span>
      )}
    </div>
  );
});
