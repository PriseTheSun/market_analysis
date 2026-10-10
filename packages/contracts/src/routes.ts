import type { Locale } from "./index.js";

// These are browser routes. API endpoints and persisted identifiers are stable.
const segments: Record<string, Record<Locale, string>> = {
  login: { "pt-BR": "entrar", en: "sign-in", es: "iniciar-sesion" },
  "solicitar-acesso": {
    "pt-BR": "solicitar-acesso",
    en: "request-access",
    es: "solicitar-acceso",
  },
  "recuperar-senha": {
    "pt-BR": "recuperar-senha",
    en: "recover-password",
    es: "recuperar-contrasena",
  },
  "redefinir-senha": {
    "pt-BR": "redefinir-senha",
    en: "reset-password",
    es: "restablecer-contrasena",
  },
  "aceitar-convite": {
    "pt-BR": "aceitar-convite",
    en: "accept-invitation",
    es: "aceptar-invitacion",
  },
  platform: { "pt-BR": "plataforma", en: "platform", es: "plataforma" },
  agencies: { "pt-BR": "agencias", en: "agencies", es: "agencias" },
  organizations: {
    "pt-BR": "organizacoes",
    en: "organizations",
    es: "organizaciones",
  },
  users: { "pt-BR": "contas", en: "accounts", es: "cuentas" },
  chat: { "pt-BR": "conversas", en: "conversations", es: "conversaciones" },
  files: { "pt-BR": "arquivos", en: "files", es: "archivos" },
  members: { "pt-BR": "membros", en: "members", es: "miembros" },
  requests: { "pt-BR": "solicitacoes", en: "requests", es: "solicitudes" },
  notifications: {
    "pt-BR": "notificacoes",
    en: "notifications",
    es: "notificaciones",
  },
  preferences: {
    "pt-BR": "preferencias",
    en: "preferences",
    es: "preferencias",
  },
  audit: { "pt-BR": "auditoria", en: "audit", es: "auditoria" },
};

export const appRouteTemplates = [
  "/",
  "/login",
  "/solicitar-acesso",
  "/recuperar-senha",
  "/redefinir-senha",
  "/aceitar-convite",
  "/app",
  "/app/:tenantId",
  "/app/:tenantId/chat",
  "/app/:tenantId/files",
  "/app/:tenantId/members",
  "/app/:tenantId/requests",
  "/app/:tenantId/notifications",
  "/app/:tenantId/preferences",
  "/app/:tenantId/audit",
  "/platform",
  "/platform/agencies",
  "/platform/organizations",
  "/platform/users",
  "/platform/requests",
  "/platform/notifications",
  "/platform/preferences",
  "/agencies/:agencyId",
] as const;
export type AppRouteTemplate = (typeof appRouteTemplates)[number];

function translateTemplate(template: string, locale: Locale) {
  return template
    .split("/")
    .map((segment) => segments[segment]?.[locale] ?? segment)
    .join("/");
}

export function appRoutePatterns(template: AppRouteTemplate): string[] {
  return [
    ...new Set([
      template,
      ...(["pt-BR", "en", "es"] as const).map((locale) =>
        translateTemplate(template, locale),
      ),
      ...(template === "/platform/organizations" ? ["/platform/tenants"] : []),
      ...(template === "/app" ? ["/contexts"] : []),
    ]),
  ];
}

const routes = appRouteTemplates.flatMap((template) =>
  appRoutePatterns(template).map((pattern) => ({
    template,
    parts: pattern.split("/"),
  })),
);

function resolveAppPath(path: string, locale?: Locale) {
  const [, pathname = "", suffix = ""] = /^([^?#]*)(.*)$/.exec(path)!;
  const parts = (pathname.replace(/\/+$/, "") || "/").split("/");
  const route = routes.find(
    ({ parts: pattern }) =>
      pattern.length === parts.length &&
      pattern.every((part, index) =>
        part.startsWith(":") ? !!parts[index] : part === parts[index],
      ),
  );
  if (!route) return path;
  const template = locale
    ? translateTemplate(route.template, locale)
    : route.template;
  return (
    template
      .split("/")
      .map((part, index) => (part.startsWith(":") ? parts[index] : part))
      .join("/") + suffix
  );
}

export function routeLocale(language: string): Locale {
  return language.startsWith("es")
    ? "es"
    : language.startsWith("en")
      ? "en"
      : "pt-BR";
}

/** Translate only recognized route segments, preserving IDs, queries and fragments. */
export function localizedAppPath(path: string, language: string): string {
  return resolveAppPath(path, routeLocale(language));
}

/** Stable identity for authorization and page state across language changes. */
export function canonicalAppPath(path: string): string {
  return resolveAppPath(path);
}
