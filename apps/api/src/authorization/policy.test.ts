import { describe, it, expect } from "vitest";
import {
  effectiveRole,
  permits,
  type EffectiveRole,
  type Action,
} from "./policy.js";
describe("permission matrix", () => {
  it.each(["GLOBAL", "SUPER_ADMIN", "ADMIN"] as EffectiveRole[])(
    "%s can manage selected scope",
    (role) => {
      for (const action of ["chat", "files", "members", "requests"] as Action[])
        expect(permits(role, action)).toBe(true);
    },
  );
  it("User only has chat among business modules", () => {
    expect(permits("USER", "chat")).toBe(true);
    for (const action of ["files", "members", "requests"] as Action[])
      expect(permits("USER", action)).toBe(false);
  });
  it("does not infer authority without a scoped grant", () => {
    expect(effectiveRole(false, false, null)).toBeNull();
    expect(effectiveRole(false, false, "USER")).toBe("USER");
    expect(effectiveRole(false, false, "ADMIN")).toBe("ADMIN");
    expect(effectiveRole(false, true, null)).toBe("SUPER_ADMIN");
    expect(effectiveRole(true, false, null)).toBe("GLOBAL");
  });
});
