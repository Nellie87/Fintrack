import { describe, expect, it } from "vitest";
import { csvField, toCsv } from "./csv";
import { paginationSchema } from "./schemas";

describe("CSV export", () => {
  it("leaves plain values alone and quotes commas, quotes and line breaks", () => {
    expect(csvField("SCOM")).toBe("SCOM");
    expect(csvField(1250.5)).toBe("1250.5");
    expect(csvField("Acacia, Family Trust")).toBe('"Acacia, Family Trust"');
    expect(csvField('The "Baobab" Fund')).toBe('"The ""Baobab"" Fund"');
  });

  it("neutralises text that a spreadsheet would run as a formula", () => {
    expect(csvField("=HYPERLINK(\"x\")")).toBe("\"'=HYPERLINK(\"\"x\"\")\"");
    expect(csvField("@SUM(A1)")).toBe("'@SUM(A1)");
    expect(csvField(-400)).toBe("-400"); // negative numbers stay numbers
  });

  it("builds a header row plus one line per row, with CRLF line endings", () => {
    expect(toCsv(["a", "b"], [[1, "x"], [2, "y"]])).toBe("a,b\r\n1,x\r\n2,y\r\n");
  });
});

describe("paginationSchema", () => {
  it("returns undefined (all rows) when no page parameters are given", () => {
    expect(paginationSchema.parse({})).toBeUndefined();
  });

  it("fills in defaults and coerces query strings to numbers", () => {
    expect(paginationSchema.parse({ page: "2" })).toEqual({ page: 2, pageSize: 20 });
    expect(paginationSchema.parse({ pageSize: "5" })).toEqual({ page: 1, pageSize: 5 });
  });

  it("rejects pages below 1 and page sizes above 100", () => {
    expect(paginationSchema.safeParse({ page: "0" }).success).toBe(false);
    expect(paginationSchema.safeParse({ pageSize: "500" }).success).toBe(false);
    expect(paginationSchema.safeParse({ page: "abc" }).success).toBe(false);
  });
});
