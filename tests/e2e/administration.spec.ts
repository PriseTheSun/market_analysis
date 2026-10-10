import { test, expect, type Page } from "@playwright/test";
async function signIn(page: Page, role: string) {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill(role + "@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/[^/]+\/conversas$/);
}
test("Global creates agency and provisioning tenant, then disables both through scoped dialogs", async ({
  page,
}) => {
  const suffix = Date.now(),
    agency = "Agência E2E " + suffix,
    tenant = "Tenant E2E " + suffix;
  await signIn(page, "global");
  await page
    .getByRole("link", { name: "Administração global", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Criar agência", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill(agency);
  await dialog
    .getByRole("textbox", { name: "Identificador", exact: true })
    .fill("e2e-" + suffix);
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("link", { name: "Organizações", exact: true }).click();
  await page
    .getByRole("button", { name: "Criar organização", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill(tenant);
  await dialog
    .getByRole("textbox", { name: "Identificador", exact: true })
    .fill("client-" + suffix);
  await dialog
    .getByRole("combobox", { name: "Agência", exact: true })
    .selectOption({ label: agency });
  await dialog
    .getByRole("textbox", { name: "E-mail do Admin responsável", exact: true })
    .fill("bootstrap-" + suffix + "@example.test");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(tenant);
  let row = page.getByRole("row").filter({ hasText: tenant });
  await expect(row).toBeVisible();
  await page.reload();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(tenant);
  await row.getByRole("button", { name: `Ações de ${tenant}` }).click();
  await page.getByRole("menuitem", { name: "Alterar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("disabled");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("link", { name: "Agências", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(agency);
  row = page.getByRole("row").filter({ hasText: agency });
  await row.getByRole("button", { name: `Ações de ${agency}` }).click();
  await page.getByRole("menuitem", { name: "Alterar", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Status", exact: true })
    .selectOption("false");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Confirmar", exact: true })
    .click();
  await expect(row.getByText("Inativo", { exact: true })).toBeVisible();
});
test("Super Admin enters agency and tenant management without platform mutation controls", async ({
  page,
}) => {
  await signIn(page, "superadmin");
  await expect(
    page.getByRole("link", { name: "Administração global", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Trocar espaço", exact: true })
    .click();
  await page.getByRole("menuitem", { name: /^Agência Demo A/ }).click();
  await expect(
    page.getByRole("heading", { name: "Organizações", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar organização", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("row")
    .filter({ hasText: "Aurora" })
    .getByRole("button", { name: "Ações de Aurora", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Abrir", exact: true }).click();
  await page.getByRole("link", { name: "Membros", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Convidar membro", exact: true }),
  ).toBeVisible();
});
