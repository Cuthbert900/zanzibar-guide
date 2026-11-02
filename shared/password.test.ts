import { describe, expect, it } from "vitest";
import { unmetPasswordRules } from "./password";

const unmet = (password: string, email = "amina@example.com") => unmetPasswordRules(password, email).map((rule) => rule.id);

describe("unmetPasswordRules", () => {
  it("accepts a long password with letters and numbers", () => {
    expect(unmet("coral reef 2024 dhow")).toEqual([]);
  });

  it("flags short passwords and passwords without both letters and numbers", () => {
    expect(unmet("abc12")).toContain("length");
    expect(unmet("onlyletterslong")).toContain("mix");
    expect(unmet("1234567890123")).toContain("mix");
  });

  it("rejects common passwords, including with digits or symbols added", () => {
    expect(unmet("Password123!")).toContain("common");
    expect(unmet("zanzibar2026")).toContain("common");
    expect(unmet("12345678901")).toContain("common");
  });

  it("rejects passwords containing the email name", () => {
    expect(unmet("amina-beach-2026")).toContain("email");
    expect(unmet("amina-beach-2026", "jo@example.com")).not.toContain("email");
  });
});
