import { describe, it, expect } from "vitest";
import { resolveTheme } from "./theme";

describe("resolveTheme", () => {
  it("returns dark when preference is dark regardless of OS theme", () => {
    expect(resolveTheme("dark", "light")).toBe("dark");
    expect(resolveTheme("dark", "dark")).toBe("dark");
  });

  it("returns light when preference is light regardless of OS theme", () => {
    expect(resolveTheme("light", "dark")).toBe("light");
    expect(resolveTheme("light", "light")).toBe("light");
  });

  it("follows OS theme when preference is auto", () => {
    expect(resolveTheme("auto", "dark")).toBe("dark");
    expect(resolveTheme("auto", "light")).toBe("light");
  });
});
