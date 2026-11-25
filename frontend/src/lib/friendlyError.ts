import { ApiError } from "../api/client";

/**
 * Turns any error into a sentence an analyst can act on, without status codes or jargon.
 * The API's own messages are kept where they are already specific and plain
 * (e.g. "Cannot sell 500 SCOM: only 300 held on 2026-01-02.").
 */
export function friendlyError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Something unexpected happened. Please try again.";

  switch (error.code) {
    case "NETWORK_ERROR":
      return "We can't reach FinTrack right now. Check your internet connection, then try again.";
    case "UNAUTHORIZED":
      return error.message.startsWith("Incorrect")
        ? "That email and password don't match. Check them and try again."
        : "You've been signed out for security. Please log in again.";
    case "EMAIL_TAKEN":
      return "There's already an account with this email. Try logging in instead.";
    case "NOT_FOUND":
      return "We couldn't find this. It may have been deleted.";
    case "VALIDATION_ERROR":
      return "Some details need another look. Check the highlighted fields.";
    case "INSUFFICIENT_HOLDINGS":
    case "CONFLICT":
      return error.message;
  }
  if (error.status >= 500) return "Something went wrong on our side. Please try again in a moment.";
  return "That didn't work. Please try again.";
}

/** Rewrites the few field messages from the API that read like system output. */
export function friendlyFieldMessage(message: string): string {
  const held = /^Exceeds holding of (.+)\.$/.exec(message);
  if (held) return `You only hold ${held[1]}, so you can't sell more than that.`;
  return message;
}
