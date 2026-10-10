import type { Context, PublicUser } from "@market/contracts";

export interface AgencyContext {
  id: string;
  name: string;
}

export function workspaceDestination(
  user: PublicUser,
  contexts: Context[],
  agencies: AgencyContext[],
  lastTenant: string | null,
): string | null {
  // A stored preference is only a hint; access comes from the current API list.
  const tenant =
    contexts.find((context) => context.id === lastTenant) ?? contexts[0];
  if (tenant) return `/app/${tenant.id}/chat`;
  if (user.platformRole === "GLOBAL") return "/platform/agencies";
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
