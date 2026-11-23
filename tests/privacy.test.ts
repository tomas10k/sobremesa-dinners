import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// The repo is public. Real emails live in env vars and Supabase, never in tracked files.
const PERSONAL_EMAIL = /[\w.+-]+@(gmail|googlemail|yahoo|hotmail|outlook|icloud|me|live|aol|protonmail)\.(com|me)/gi;
const SKIP = /(^|\/)(package-lock\.json|.*\.(png|jpe?g|gif|webp|ico|woff2?|ttf|pdf))$/;

describe("privacy", () => {
  it("has no personal email addresses in tracked files", () => {
    const files = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter((f) => f && !SKIP.test(f));
    const found = files.flatMap((f) => {
      let text = "";
      try { text = readFileSync(f, "utf8"); } catch { return []; }
      return (text.match(PERSONAL_EMAIL) ?? []).map((m) => `${f}: ${m}`);
    });
    expect(found).toEqual([]);
  });
});
