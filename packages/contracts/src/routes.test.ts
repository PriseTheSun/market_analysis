import { describe, expect, it } from "vitest";
import {
  appRoutePatterns,
  appRouteTemplates,
  canonicalAppPath,
  localizedAppPath,
} from "./routes.js";

describe("localized browser routes", () => {
  it.each([
    ["pt-BR", "/plataforma/organizacoes"],
    ["en", "/platform/organizations"],
    ["es", "/plataforma/organizaciones"],
  ])("renames old tenant links in %s", (locale, expected) => {
    expect(localizedAppPath("/platform/tenants", locale)).toBe(expected);
    expect(localizedAppPath("/platform/organizations", locale)).toBe(expected);
  });

  it("uses the selected locale even when a link was written in another language", () => {
    expect(localizedAppPath("/plataforma/organizacoes", "es")).toBe(
      "/plataforma/organizaciones",
    );
    expect(localizedAppPath("/app/client-a/preferences", "pt-BR")).toBe(
      "/app/client-a/preferencias",
    );
    expect(localizedAppPath("/app/client-a/arquivos", "en")).toBe(
      "/app/client-a/files",
    );
    expect(localizedAppPath("/agencies/agency-a", "pt-BR")).toBe(
      "/agencias/agency-a",
    );
  });

  it("preserves identifiers that happen to be translatable words", () => {
    expect(localizedAppPath("/app/files/chat", "es")).toBe(
      "/app/files/conversaciones",
    );
    expect(localizedAppPath("/agencies/platform", "pt-BR")).toBe(
      "/agencias/platform",
    );
  });

  it("preserves query strings and invitation fragments without interpreting them as routes", () => {
    expect(
      localizedAppPath(
        "/aceitar-convite?source=platform#token=abc%2Ftenants%3D",
        "en",
      ),
    ).toBe("/accept-invitation?source=platform#token=abc%2Ftenants%3D");
    expect(
      localizedAppPath(
        "/platform/tenants/?search=files&page=2#results",
        "pt-BR",
      ),
    ).toBe("/plataforma/organizacoes?search=files&page=2#results");
  });

  it("localizes authentication and preserves old entry links", () => {
    expect(localizedAppPath("/login", "pt-BR")).toBe("/entrar");
    expect(localizedAppPath("/recuperar-senha", "en")).toBe(
      "/recover-password",
    );
    expect(localizedAppPath("/redefinir-senha", "es")).toBe(
      "/restablecer-contrasena",
    );
    expect(localizedAppPath("/solicitar-acesso", "en-US")).toBe(
      "/request-access",
    );
    expect(localizedAppPath("/contexts", "es")).toBe("/app");
  });

  it("does not translate API paths, external links or unknown pages", () => {
    for (const path of [
      "/api/v1/platform/tenants",
      "/unknown/files",
      "https://example.test/platform/tenants",
      "/app/client/unknown",
      "/app//files",
    ])
      expect(localizedAppPath(path, "es")).toBe(path);
  });

  it("keeps every registered page reachable and its identity stable in all languages", () => {
    for (const template of appRouteTemplates) {
      const path = template
        .replace(":tenantId", "client-a")
        .replace(":agencyId", "agency-a");
      for (const locale of ["pt-BR", "en", "es"]) {
        const localized = localizedAppPath(path, locale);
        const patterns = appRoutePatterns(template).map((pattern) =>
          pattern
            .replace(":tenantId", "client-a")
            .replace(":agencyId", "agency-a"),
        );
        expect(patterns).toContain(localized);
        expect(canonicalAppPath(localized)).toBe(path);
        expect(localizedAppPath(localized, locale)).toBe(localized);
      }
    }
  });
});
