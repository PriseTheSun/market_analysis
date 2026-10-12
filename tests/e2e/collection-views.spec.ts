import { test, expect, type Page } from "@playwright/test";
import { switchWorkspace } from "./workspace";

async function login(page: Page, role = "global") {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill(`${role}@marketanalysis.com`);
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
}
async function choose(page: Page, name: "Cards" | "Tabela") {
  await page.getByRole("button", { name, exact: true }).first().click();
  await expect(
    page.getByRole("button", { name, exact: true }).first(),
  ).toHaveAttribute("aria-pressed", "true");
}
async function sameRecords(page: Page, label: string) {
  await choose(page, "Cards");
  const list = page.getByRole("list", { name: label, exact: true });
  await expect(list).toBeVisible();
  const names = await list.locator(".record-card-identity").allTextContents();
  expect(names.length).toBeGreaterThan(0);
  await choose(page, "Tabela");
  const table = page.getByRole("table", { name: label, exact: true });
  await expect(table).toBeVisible();
  expect(
    await table.locator("tbody tr td:first-child").allTextContents(),
  ).toEqual(names);
  await expect(list).toHaveCount(0);
  await choose(page, "Cards");
  expect(await list.locator(".record-card-identity").allTextContents()).toEqual(
    names,
  );
  await expect(table).toHaveCount(0);
}

test("real management lists retain records, filters, pagination and editing when switching views", async ({
  page,
}) => {
  await login(page);
  await expect(
    page.getByRole("button", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  for (const label of ["Usuários", "Permissões", "Agências", "Clientes"]) {
    await page.getByRole("tab", { name: label, exact: true }).click();
    await sameRecords(page, label);
  }
  await page.getByRole("tab", { name: "Usuários", exact: true }).click();
  const next = page.getByRole("button", { name: "Próxima", exact: true });
  await expect(next).toBeEnabled();
  await next.click();
  await expect(page.getByText(/Página 2 de/)).toBeVisible();
  await sameRecords(page, "Usuários");
  await expect(page.getByText(/Página 2 de/)).toBeVisible();
  await page
    .getByRole("textbox", { name: "Buscar", exact: true })
    .fill("admin@marketanalysis.com");
  await page
    .getByRole("combobox", { name: "Agência", exact: true })
    .selectOption({ label: "Agência Demo A" });
  await expect(page.locator(".record-card")).toHaveCount(1);
  await sameRecords(page, "Usuários");
  await expect(
    page.getByRole("textbox", { name: "Buscar", exact: true }),
  ).toHaveValue("admin@marketanalysis.com");
  await expect(
    page
      .getByRole("combobox", { name: "Agência", exact: true })
      .locator("option:checked"),
  ).toHaveText("Agência Demo A");
  for (const view of ["Cards", "Tabela"] as const) {
    await choose(page, view);
    await page
      .getByRole("button", { name: "Ações de Admin", exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
    await expect(
      page
        .getByRole("dialog")
        .getByRole("textbox", { name: "E-mail", exact: true }),
    ).toHaveValue("admin@marketanalysis.com");
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
  }
});

test("preference survives navigation and reload, syncs tabs, and stays isolated per user", async ({
  page,
  context,
}) => {
  await login(page);
  await choose(page, "Tabela");
  await page
    .getByRole("link", { name: "Solicitações de acesso", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Tabela", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Tabela", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  const other = await context.newPage();
  await other.goto("/plataforma/gestao");
  await expect(
    other.getByRole("button", { name: "Tabela", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await choose(page, "Cards");
  await expect(
    other.getByRole("button", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
  await choose(page, "Tabela");
  await other.close();
  await page.locator(".sidebar .platform-account-trigger").click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await login(page, "admin");
  await switchWorkspace(page, "Aurora");
  await page.getByRole("link", { name: "Arquivos", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Cards", exact: true }),
  ).toHaveAttribute("aria-pressed", "true");
});

test("view switching still works when browser storage writes fail", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith("ma.listView."))
        throw new DOMException("Storage full", "QuotaExceededError");
      return original.call(this, key, value);
    };
  });
  await login(page);
  await sameRecords(page, "Usuários");
});

// Deterministic API fixtures exercise the remaining list layouts without changing
// memberships, files, requests or audit records in the local database.
test("requests, files, members, invitations, agency clients and audit share both layouts", async ({
  page,
}) => {
  test.setTimeout(60000);
  await login(page);
  const user = {
    id: "fixture-user",
    name: "Pessoa de teste",
    email: "test@example.test",
    active: true,
    platformRole: null,
  };
  const result = (items: unknown[]) => ({
    items,
    total: items.length,
    page: 1,
    pageSize: 12,
  });
  await page.route("**/api/v1/platform/access-requests?*", (route) =>
    route.fulfill({
      json: result([
        {
          id: "request",
          name: user.name,
          email: user.email,
          organization: "Agência de teste",
          tenantId: null,
          tenant: null,
          status: "pending",
        },
      ]),
    }),
  );
  await page
    .getByRole("link", { name: "Solicitações de acesso", exact: true })
    .click();
  await sameRecords(page, "Solicitações de acesso");
  await page.getByRole("button", { name: `Ações de ${user.name}` }).click();
  await page.getByRole("menuitem", { name: "Abrir", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Agência de teste");
  await page.keyboard.press("Escape");
  await switchWorkspace(page, "Aurora");
  const tenantPath = new URL(page.url()).pathname.replace(/\/conversas$/, "");
  await page.route("**/api/v1/tenants/*/files?*", (route) =>
    route.fulfill({
      json: result([
        {
          id: "file",
          name: "Relatório de mercado.pdf",
          size: 2048,
          type: "application/pdf",
          status: "available",
          createdAt: new Date().toISOString(),
        },
      ]),
    }),
  );
  await page.route("**/api/v1/tenants/*/members?*", (route) =>
    route.fulfill({
      json: result([{ id: "member", user, active: true, role: "USER" }]),
    }),
  );
  await page.route("**/api/v1/tenants/*/invitations", (route) =>
    route.fulfill({
      json: [
        {
          id: "invitation",
          email: "invite@example.test",
          role: "USER",
          deliveryStatus: "sent",
          consumedAt: null,
          expiresAt: "2099-01-01T00:00:00Z",
        },
      ],
    }),
  );
  await page.getByRole("link", { name: "Arquivos", exact: true }).click();
  await sameRecords(page, "Arquivos");
  await expect(
    page.getByRole("button", {
      name: "Baixar arquivo Relatório de mercado.pdf",
    }),
  ).toBeEnabled();
  await page.getByRole("link", { name: "Membros", exact: true }).click();
  await sameRecords(page, "Membros");
  await sameRecords(page, "Convites");
  await page.route(
    "**/api/v1/platform/tenants/*/conversations/audit",
    (route) =>
      route.fulfill({
        json: {
          items: [
            { id: "conversation", title: "Análise de mercado", owner: user },
          ],
        },
      }),
  );
  await page.goto(`${tenantPath}/auditoria`);
  await page
    .getByRole("textbox", { name: "Motivo", exact: true })
    .fill("Verificar visualização em cards e tabela");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await sameRecords(page, "Consultar conversas");
  await page
    .getByRole("button", { name: "Trocar espaço", exact: true })
    .click();
  await page.getByRole("menuitem", { name: /^Agência Demo A/ }).click();
  await sameRecords(page, "Clientes");
});

test("cards are responsive and table remains a scrollable table on mobile", async ({
  page,
}) => {
  await login(page);
  for (const width of [1665, 1024, 390]) {
    await page.setViewportSize({ width, height: 945 });
    await choose(page, "Cards");
    await expect(page.locator(".record-card").first()).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const columns = await page
      .locator(".record-grid")
      .evaluate(
        (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
      );
    expect(columns).toBe(width === 1665 ? 3 : width === 1024 ? 2 : 1);
    await choose(page, "Tabela");
    await expect(
      page.getByRole("table", { name: "Usuários", exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  await page.setViewportSize({ width: 1665, height: 945 });
  await choose(page, "Cards");
  await page.getByRole("switch", { name: "Modo escuro" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(page.locator(".record-card").first()).toBeVisible();
  await page.getByRole("switch", { name: "Modo escuro" }).click();
});
