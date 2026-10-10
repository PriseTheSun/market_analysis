export interface Actor {
  id: string;
  platformRole: "GLOBAL" | null;
}
export type Action = "chat" | "files" | "members" | "requests";
export type EffectiveRole = "GLOBAL" | "SUPER_ADMIN" | "ADMIN" | "USER";
export interface Scope {
  actor: Actor;
  tenantId: string;
  agencyId: string;
  role: EffectiveRole;
  requestId: string;
}
export function permits(role: EffectiveRole, action: Action): boolean {
  return role !== "USER" || action === "chat";
}
export function effectiveRole(
  global: boolean,
  agency: boolean,
  tenant: "ADMIN" | "USER" | null,
): EffectiveRole | null {
  return global ? "GLOBAL" : agency ? "SUPER_ADMIN" : tenant;
}
