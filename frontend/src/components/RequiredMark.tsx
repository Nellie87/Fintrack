/**
 * Red asterisk for compulsory fields. Screen readers hear "required" instead of "star"
 * (the input itself also carries the `required` attribute).
 */
export function RequiredMark() {
  return (
    <>
      <span className="required-mark" aria-hidden="true">
        *
      </span>
      <span className="visually-hidden"> (required)</span>
    </>
  );
}

/** "* Required" legend shown at the top of a form. */
export function RequiredNote() {
  return (
    <p className="required-note">
      <span className="required-mark" aria-hidden="true">
        *
      </span>{" "}
      Required field
    </p>
  );
}
