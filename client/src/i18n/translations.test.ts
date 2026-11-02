import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { translations } from "./translations";

const english = translations.en;
const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).sort();

describe("translations", () => {
  for (const [language, dict] of Object.entries(translations)) {
    it(`${language} has every English entry, with the same placeholders`, () => {
      expect(Object.keys(dict).sort()).toEqual(Object.keys(english).sort());
      for (const [key, text] of Object.entries(english)) {
        expect(placeholders(dict[key]), `${language}.${key}`).toEqual(placeholders(text));
      }
    });
  }

  it("has an English entry for every key used in the app", () => {
    const srcDir = join(__dirname, "..");
    const files = readdirSync(srcDir, { recursive: true, encoding: "utf8" }).filter(
      (file) => /\.tsx?$/.test(file) && !file.includes("i18n"),
    );
    const usedKeys = new Set(
      files.flatMap((file) => [...readFileSync(join(srcDir, file), "utf8").matchAll(/\b(?:t\(\s*|contentKey:\s*)["']([A-Za-z0-9_]+)["']/g)].map((m) => m[1])),
    );
    expect([...usedKeys].filter((key) => !(key in english))).toEqual([]);
  });
});
