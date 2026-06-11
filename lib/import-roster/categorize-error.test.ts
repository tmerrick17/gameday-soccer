import { describe, it, expect } from "vitest";
import { categorizeImportError } from "./categorize-error";

describe("categorizeImportError", () => {
  it("returns rate-limited for functions/resource-exhausted", () => {
    expect(
      categorizeImportError({ code: "functions/resource-exhausted" })
    ).toBe("rate-limited");
  });

  it("returns too-large for functions/invalid-argument", () => {
    expect(
      categorizeImportError({ code: "functions/invalid-argument" })
    ).toBe("too-large");
  });

  it("returns unreadable for an error with an unrecognized code", () => {
    expect(categorizeImportError(new Error("something went wrong"))).toBe(
      "unreadable"
    );
  });

  it("returns unreadable for a non-object rejection value", () => {
    expect(categorizeImportError("string reason")).toBe("unreadable");
    expect(categorizeImportError(null)).toBe("unreadable");
    expect(categorizeImportError(undefined)).toBe("unreadable");
  });
});
