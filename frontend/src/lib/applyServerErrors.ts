import type { FieldValues, Path, UseFormSetError } from "react-hook-form";
import { ApiError } from "../api/client";
import { friendlyError, friendlyFieldMessage } from "./friendlyError";

/**
 * Puts the API's per-field errors (error.details) under the matching inputs.
 * Returns the plain-language message for the form's banner, or null if every
 * error was attached to a field.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly Path<T>[],
): string | null {
  if (!(error instanceof ApiError)) return friendlyError(error);

  let unmatched = error.details.length === 0;
  for (const detail of error.details) {
    const field = fields.find((f) => f === detail.field);
    if (field) setError(field, { type: "server", message: friendlyFieldMessage(detail.message) });
    else unmatched = true;
  }
  return unmatched ? friendlyError(error) : null;
}
