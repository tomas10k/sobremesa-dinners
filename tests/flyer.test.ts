import { describe, expect, it } from "vitest";
import { flyerCredit } from "@/components/admin/flyer";

describe("flyerCredit", () => {
  it("joins role and company", () => {
    expect(flyerCredit({ role: "VP Product", company: "Mercado Libre" })).toBe("VP Product, Mercado Libre");
  });
  it("leaves out whichever is blank", () => {
    expect(flyerCredit({ role: "Partner", company: " " })).toBe("Partner");
    expect(flyerCredit({ role: "", company: "Acme" })).toBe("Acme");
  });
  it("skips the speaker when both are blank", () => {
    expect(flyerCredit({ role: "", company: "" })).toBeNull();
  });
});
