import type { Locale } from "./index.js";
import type { ManagementKind } from "./management.js";

const managementTabs: Record<ManagementKind, Record<Locale, string>> = {
  users: { "pt-BR": "usuarios", en: "users", es: "usuarios" },
  permissions: { "pt-BR": "permissoes", en: "permissions", es: "permisos" },
  agencies: { "pt-BR": "agencias", en: "agencies", es: "agencias" },
  clients: { "pt-BR": "clientes", en: "clients", es: "clientes" },
};

export function canonicalManagementTab(value: string | null) {
  return (Object.keys(managementTabs) as ManagementKind[]).find((key) =>
    Object.values(managementTabs[key]).some((tab) => tab === value),
  );
}

export function localizedManagementTab(tab: ManagementKind, language: string) {
  return managementTabs[tab][routeLocale(language)];
}

function managementSuffix(suffix: string, locale?: Locale) {
  const hashIndex = suffix.indexOf("#");
  const search = hashIndex < 0 ? suffix : suffix.slice(0, hashIndex);
  const hash = hashIndex < 0 ? "" : suffix.slice(hashIndex);
  const params = new URLSearchParams(search);
  const tab = canonicalManagementTab(params.get("tab"));
  if (!tab) return suffix;
  const value = locale ? localizedManagementTab(tab, locale) : tab;
  if (params.get("tab") === value) return suffix;
  params.set("tab", value);
  return `?${params}${hash}`;
}

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
  management: { "pt-BR": "gestao", en: "management", es: "gestion" },
  agencies: { "pt-BR": "agencias", en: "agencies", es: "agencias" },
  clients: { "pt-BR": "clientes", en: "clients", es: "clientes" },
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
  "/platform/management",
  "/platform/agencies",
  "/platform/clients",
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
      ...(template === "/platform/clients"
        ? [
            "/platform/tenants",
            "/platform/organizations",
            "/plataforma/organizacoes",
            "/plataforma/organizaciones",
          ]
        : []),
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
      .join("/") +
    (route.template === "/platform/management"
      ? managementSuffix(suffix, locale)
      : suffix)
  );
}

export function routeLocale(language: string): Locale {
  return language.startsWith("es")
    ? "es"
    : language.startsWith("en")
      ? "en"
      : "pt-BR";
}

/** Translate recognized routes and management tabs, preserving IDs and other parameters. */
export function localizedAppPath(path: string, language: string): string {
  return resolveAppPath(path, routeLocale(language));
}

/** Stable identity for authorization and page state across language changes. */
export function canonicalAppPath(path: string): string {
  return resolveAppPath(path);
}
