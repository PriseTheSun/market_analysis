import type { Context, Page, PublicUser } from "@market/contracts";

export interface AgencyContext {
  id: string;
  name: string;
  active?: boolean;
}

export interface AgencyWorkspace extends AgencyContext {
  canManage: boolean;
  clients: Context[];
}

/** Load every authorized agency, including those beyond the first API page. */
export async function loadAllAgencies(
  loadPage: (page: number) => Promise<Page<AgencyContext>>,
): Promise<AgencyContext[]> {
  const agencies = new Map<string, AgencyContext>();
  let page = 1;
  while (true) {
    const result = await loadPage(page);
    for (const agency of result.items) agencies.set(agency.id, agency);
    if (!result.items.length || page * result.pageSize >= result.total) break;
    page += 1;
  }
  return [...agencies.values()];
}

/** Agency management access and client membership are independent permissions. */
export function groupWorkspaces(
  agencies: AgencyContext[],
  contexts: Context[],
  locale: string,
): AgencyWorkspace[] {
  const groups = new Map<string, AgencyWorkspace>(
    agencies.map((agency) => [
      agency.id,
      { ...agency, canManage: agency.active !== false, clients: [] },
    ]),
  );
  for (const context of contexts) {
    let agency = groups.get(context.agencyId);
    if (!agency) {
      agency = {
        id: context.agencyId,
        name: context.agencyName,
        active: true,
        canManage: false,
        clients: [],
      };
      groups.set(agency.id, agency);
    }
    if (agency.active !== false) agency.clients.push(context);
  }
  const compare = new Intl.Collator(locale, {
    sensitivity: "base",
    numeric: true,
  });
  const byName = (a: AgencyContext, b: AgencyContext) =>
    compare.compare(a.name, b.name) || a.id.localeCompare(b.id);
  for (const agency of groups.values()) agency.clients.sort(byName);
  return [...groups.values()].sort(byName);
}

export function workspaceDestination(
  user: PublicUser,
  contexts: Context[],
  agencies: AgencyContext[],
  lastTenant: string | null,
): string | null {
  // Global always enters platform administration, regardless of the last tenant.
  if (user.platformRole === "GLOBAL") return "/platform/agencies";
  // A stored preference is only a hint; access comes from the current API list.
  const tenant =
    contexts.find((context) => context.id === lastTenant) ?? contexts[0];
  if (tenant) return `/app/${tenant.id}/chat`;
  if (agencies[0]) return `/agencies/${agencies[0].id}`;
  return null;
}

export function lastWorkspace(userId: string): string | null {
  try {
    return localStorage.getItem(`ma.lastTenant.${userId}`);
  } catch {
    return null;
  }
}

export function rememberWorkspace(userId: string, tenantId: string) {
  try {
    localStorage.setItem(`ma.lastTenant.${userId}`, tenantId);
  } catch {
    // Navigation also works when browser storage is unavailable.
  }
}
