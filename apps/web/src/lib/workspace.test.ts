import { describe, expect, it, vi } from "vitest";
import type { Context, PublicUser } from "@market/contracts";
import {
  groupWorkspaces,
  loadAllAgencies,
  searchWorkspaces,
  workspaceDestination,
} from "./workspace";

const user: PublicUser = {
  id: "user-a",
  name: "Pessoa",
  email: "user@example.test",
  platformRole: null,
  avatarUrl: null,
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
      ).toBe("/platform/management");
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
    ).toBe("/platform/management");
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

describe("agency workspace hierarchy", () => {
  it("searches agencies without accents or case and keeps their authorized clients", () => {
    const groups = groupWorkspaces([], contexts, "pt-BR");
    const results = searchWorkspaces(groups, "  AGENCIA  ");
    expect(results).toHaveLength(1);
    expect(results[0]?.matchingClients.map((client) => client.id)).toEqual([
      "atlas",
      "aurora",
    ]);
    expect(results[0]?.canManage).toBe(false);
    expect(searchWorkspaces(groups, "   ")).toEqual(results);
  });

  it("finds a client within its agency without changing total counts or the source list", () => {
    const groups = groupWorkspaces(
      [{ id: "empty", name: "Outra agência" }],
      contexts,
      "pt-BR",
    );
    const results = searchWorkspaces(groups, "AUR");
    expect(results).toHaveLength(1);
    expect(results[0]?.matchingClients.map((client) => client.id)).toEqual([
      "aurora",
    ]);
    expect(results[0]?.clients).toHaveLength(2);
    expect(groups.find((group) => group.id === "agency")?.clients).toHaveLength(
      2,
    );
    expect(searchWorkspaces(groups, "missing")).toEqual([]);
  });

  it("groups clients by agency ID and keeps agencies without clients", () => {
    const groups = groupWorkspaces(
      [
        { id: "empty", name: "Sem clientes" },
        { id: "other", name: "Agência" },
        { id: "agency", name: "Agência" },
      ],
      [...contexts, { ...contexts[0]!, id: "nivea", name: "Nivea" }],
      "pt-BR",
    );
    expect(groups).toHaveLength(3);
    expect(
      groups.find((a) => a.id === "agency")?.clients.map((c) => c.id),
    ).toEqual(["atlas", "aurora", "nivea"]);
    expect(groups.find((a) => a.id === "other")?.clients).toEqual([]);
    expect(groups.find((a) => a.id === "empty")).toMatchObject({
      canManage: true,
      clients: [],
    });
  });

  it("keeps the exact authorized clients without granting agency management", () => {
    const [agency] = groupWorkspaces([], contexts, "pt-BR");
    expect(agency).toMatchObject({ id: "agency", canManage: false });
    expect(agency?.clients.map((c) => c.id)).toEqual(["atlas", "aurora"]);
  });

  it("keeps inactive agencies visible but prevents opening their clients or administration", () => {
    const [agency] = groupWorkspaces(
      [{ id: "agency", name: "Agência", active: false }],
      contexts,
      "pt-BR",
    );
    expect(agency).toMatchObject({
      active: false,
      canManage: false,
      clients: [],
    });
  });

  it("loads all agency pages instead of truncating the workspace selector", async () => {
    const all = Array.from({ length: 205 }, (_, i) => ({
      id: `agency-${i}`,
      name: `Agência ${i}`,
    }));
    const loadPage = vi.fn(async (page: number) => ({
      items: all.slice((page - 1) * 100, page * 100),
      total: all.length,
      page,
      pageSize: 100,
    }));
    expect(await loadAllAgencies(loadPage)).toEqual(all);
    expect(loadPage.mock.calls).toEqual([[1], [2], [3]]);
  });

  it("stops when an agency page is empty and propagates later page failures", async () => {
    const empty = vi.fn(async () => ({
      items: [],
      total: 0,
      page: 1,
      pageSize: 100,
    }));
    expect(await loadAllAgencies(empty)).toEqual([]);
    expect(empty).toHaveBeenCalledTimes(1);
    await expect(
      loadAllAgencies(async (page) => {
        if (page === 2) throw new Error("unavailable");
        return {
          items: [{ id: "agency", name: "Agência" }],
          total: 2,
          page,
          pageSize: 1,
        };
      }),
    ).rejects.toThrow("unavailable");
  });
});
