import type { ActivityAction, ActivityModule } from "@market/contracts";

interface EventDefinition {
  modules: ActivityModule[];
  action: ActivityAction;
  entity: string;
}
const event = (
  modules: ActivityModule[],
  action: ActivityAction,
  entity: string,
): EventDefinition => ({ modules, action, entity });
export const activityEvents: Record<string, EventDefinition> = {
  "user.created": event(["management"], "created", "user"),
  "user.created-direct": event(["management"], "created", "user"),
  "user.updated": event(["management"], "updated", "user"),
  "user.global.updated": event(["management"], "access", "user"),
  "user.status.updated": event(["management"], "updated", "user"),
  "agency.created": event(["management"], "created", "agency"),
  "agency.updated": event(["management"], "updated", "agency"),
  "tenant.created": event(["management", "clients"], "created", "client"),
  "tenant.updated": event(["management", "clients"], "updated", "client"),
  "users.archived": event(["management"], "archived", "user"),
  "users.restored": event(["management"], "restored", "user"),
  "users.deleted": event(["management"], "deleted", "user"),
  "agencies.archived": event(["management"], "archived", "agency"),
  "agencies.restored": event(["management"], "restored", "agency"),
  "agencies.deleted": event(["management"], "deleted", "agency"),
  "clients.archived": event(["management", "clients"], "archived", "client"),
  "clients.restored": event(["management", "clients"], "restored", "client"),
  "clients.deleted": event(["management", "clients"], "deleted", "client"),
  "permission.created": event(
    ["management", "members"],
    "access",
    "permission",
  ),
  "permission.updated": event(
    ["management", "members"],
    "access",
    "permission",
  ),
  "permission.removed": event(
    ["management", "members"],
    "access",
    "permission",
  ),
  "membership.updated": event(
    ["management", "members"],
    "access",
    "membership",
  ),
  "agency.super-admin.updated": event(
    ["management"],
    "access",
    "agencyMembership",
  ),
  "access.submitted": event(["requests"], "created", "request"),
  "access.classified": event(["requests"], "updated", "request"),
  "access.updated": event(["requests"], "updated", "request"),
  "access.approved": event(["requests"], "approved", "request"),
  "access.rejected": event(["requests"], "rejected", "request"),
  "invitation.created": event(["requests", "members"], "created", "invitation"),
  "invitation.resent": event(["requests", "members"], "resent", "invitation"),
  "invitation.accepted": event(
    ["requests", "members"],
    "accepted",
    "invitation",
  ),
  "file.available": event(["files"], "created", "file"),
  "file.deleted": event(["files"], "deleted", "file"),
  "conversation.created": event(["chat"], "created", "conversation"),
  "conversation.audit.list": event(["audit"], "read", "conversation"),
  "conversation.audit.read": event(["audit"], "read", "conversation"),
  "ai.settings.saved": event(["ai"], "updated", "ai"),
  "ai.connection.connected": event(["ai"], "connected", "ai"),
  "ai.connection.revoked": event(["ai"], "disconnected", "ai"),
  "preferences.updated": event(["preferences"], "updated", "preferences"),
  "profile.avatar.updated": event(["preferences"], "updated", "avatar"),
  "profile.avatar.removed": event(["preferences"], "deleted", "avatar"),
  "notifications.read": event(["notifications"], "read", "notification"),
  "notifications.read-all": event(["notifications"], "read", "notification"),
};
