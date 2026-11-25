/**
 * One CSV field (RFC 4180): quoted when it contains a comma, quote or line break.
 * Text starting with = + - @ is prefixed with ' so spreadsheets don't run it as a formula
 * (CSV injection). Numbers are left alone, so negative values stay numeric.
 */
export function csvField(value: string | number): string {
  let text = String(value);
  if (typeof value === "string" && /^[=+\-@]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Rows to CSV text with Windows line endings, which Excel and Sheets both accept. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  return [header, ...rows].map((row) => row.map(csvField).join(",")).join("\r\n") + "\r\n";
}
