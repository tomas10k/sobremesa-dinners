import { describe, expect, it } from "vitest";
import { countWords, limitWords } from "@/lib/words";

describe("countWords", () => {
  it("counts words separated by any whitespace", () => {
    expect(countWords("  una  cena\npara\tcompartir ")).toBe(4);
  });
  it("is zero for blank text", () => {
    expect(countWords("   ")).toBe(0);
  });
});

describe("limitWords", () => {
  it("leaves text at or under the limit untouched", () => {
    expect(limitWords("uno dos tres ", 3)).toBe("uno dos tres ");
  });
  it("cuts pasted text right after the last allowed word", () => {
    expect(limitWords("uno dos tres cuatro", 2)).toBe("uno dos");
  });
  it("keeps a 200-word essay and cuts a 201-word one", () => {
    const essay = Array.from({ length: 201 }, (_, i) => `w${i}`).join(" ");
    expect(countWords(limitWords(essay, 200))).toBe(200);
  });
});
