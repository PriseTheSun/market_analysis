import { describe, expect, it } from "vitest";
import type { Context, PublicUser } from "@market/contracts";
import { workspaceDestination } from "./workspace";

const user: PublicUser = {
  id: "user-a",
  name: "Pessoa",
  email: "user@example.test",
  platformRole: null,
};
const contexts: Context[] = [
  {
    id: "atlas",
    name: "Atlas",
    agencyId: "agency",
    agencyName: "Agência",
    role: "USER",
  },
  {
    id: "aurora",
    name: "Aurora",
    agencyId: "agency",
    agencyName: "Agência",
    role: "ADMIN",
  },
];

describe("direct workspace entry", () => {
  it("opens the first authorized chat for a non-Global account without requiring a selection", () => {
    expect(workspaceDestination(user, contexts, [], null)).toBe(
      "/app/atlas/chat",
    );
  });
  it.each([null, "aurora", "removed-tenant"])(
    "opens global administration even with authorized tenants and last tenant %s",
    (lastTenant) => {
      expect(
        workspaceDestination(
          { ...user, platformRole: "GLOBAL" },
          contexts,
          [{ id: "agency", name: "Agência" }],
          lastTenant,
        ),
      ).toBe("/platform/agencies");
    },
  );
  it("returns to the remembered tenant only while it remains authorized", () => {
    expect(workspaceDestination(user, contexts, [], "aurora")).toBe(
      "/app/aurora/chat",
    );
    expect(workspaceDestination(user, contexts.slice(0, 1), [], "aurora")).toBe(
      "/app/atlas/chat",
    );
    expect(
      workspaceDestination(user, contexts, [], "../../platform/users"),
    ).toBe("/app/atlas/chat");
  });
  it("preserves administrative access when there are no active tenants", () => {
    expect(
      workspaceDestination(
        { ...user, platformRole: "GLOBAL" },
        [],
        [],
        "aurora",
      ),
    ).toBe("/platform/agencies");
    expect(
      workspaceDestination(
        user,
        [],
        [{ id: "agency", name: "Agência" }],
        "aurora",
      ),
    ).toBe("/agencies/agency");
  });
  it("has no protected destination without any current access", () => {
    expect(workspaceDestination(user, [], [], "aurora")).toBeNull();
  });
});
