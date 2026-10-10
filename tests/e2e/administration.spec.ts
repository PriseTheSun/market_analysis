import { test, expect, type Page } from "@playwright/test";
async function signIn(page: Page, role: string) {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill(role + "@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    role === "global" ? /\/plataforma\/gestao$/ : /\/app\/[^/]+\/conversas$/,
  );
}
test("Global manages agencies and clients in one route with archive and restoration", async ({
  page,
}) => {
  const suffix = Date.now(),
    agency = "Agência E2E " + suffix,
    client = "Cliente E2E " + suffix;
  await signIn(page, "global");
  await page.getByRole("tab", { name: "Agências", exact: true }).click();
  await page
    .getByRole("button", { name: "Criar agência", exact: true })
    .click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill(agency);
  await dialog
    .getByRole("textbox", { name: "Identificador", exact: true })
    .fill("e2e-" + suffix);
  await dialog
    .getByRole("button", { name: "Criar agência", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("tab", { name: "Clientes", exact: true }).click();
  await page
    .getByRole("button", { name: "Criar cliente", exact: true })
    .click();
  dialog = page.getByRole("dialog");
  await dialog.getByRole("textbox", { name: "Nome", exact: true }).fill(client);
  await dialog
    .getByRole("textbox", { name: "Identificador", exact: true })
    .fill("client-" + suffix);
  await dialog
    .getByRole("combobox", { name: "Agência", exact: true })
    .selectOption({ label: agency });
  await dialog
    .getByRole("combobox", { name: "Admin responsável", exact: true })
    .selectOption({ label: "Admin · admin@marketanalysis.com" });
  await dialog
    .getByRole("button", { name: "Criar cliente", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(client);
  const row = page.getByRole("row").filter({ hasText: client });
  await row.getByRole("button", { name: `Ações de ${client}` }).click();
  await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
  await dialog
    .getByRole("textbox", { name: "Nome", exact: true })
    .fill(client + " atualizado");
  await dialog
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(dialog).toHaveCount(0);
  await expect(row).toContainText(client + " atualizado");
  async function archive(name: string) {
    await page
      .getByRole("button", { name: `Ações de ${name}`, exact: true })
      .click();
    await page.getByRole("menuitem", { name: "Excluir", exact: true }).click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Confirmar exclusão", exact: true })
      .click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  await archive(client + " atualizado");
  await expect(row).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Exibir registros" })
    .selectOption("archived");
  await expect(
    row.getByRole("cell", { name: "Arquivado", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: `Ações de ${client} atualizado`, exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Restaurar", exact: true }).click();
  await dialog.getByRole("button", { name: "Restaurar", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await page
    .getByRole("combobox", { name: "Exibir registros" })
    .selectOption("current");
  await expect(row).toBeVisible();
  await archive(client + " atualizado");
  await page.getByRole("tab", { name: "Agências", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(agency);
  await archive(agency);
  await expect(page.getByRole("row").filter({ hasText: agency })).toHaveCount(
    0,
  );
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
  const agencyItem = page.getByRole("menuitem", { name: /^Agência Demo A/ });
  if ((await agencyItem.getAttribute("aria-expanded")) !== "true")
    await agencyItem.click();
  await page
    .getByRole("menuitem", { name: "Acessar agência", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Clientes", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Criar cliente", exact: true }),
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

test("Super Admin sees only Permissions and cannot select Global", async ({
  page,
}) => {
  await signIn(page, "superadmin");
  await page
    .getByRole("link", { name: "Central de gestão", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plataforma\/gestao$/);
  await expect(page.getByRole("tab")).toHaveCount(1);
  await expect(
    page.getByRole("tab", { name: "Permissões", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await page
    .getByRole("button", { name: "Criar permissão", exact: true })
    .click();
  const scope = page
    .getByRole("dialog")
    .getByRole("combobox", { name: "Escopo de acesso", exact: true });
  await expect(scope.locator("option")).toHaveText([
    "Cliente",
    "Agência · Super Admin",
  ]);
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await page.goto("/plataforma/gestao?tab=users");
  await expect(
    page.getByRole("tab", { name: "Permissões", exact: true }),
  ).toHaveAttribute("aria-selected", "true");
  await expect(
    page.getByRole("button", { name: "Criar usuário", exact: true }),
  ).toHaveCount(0);
});
for (const role of ["admin", "user"])
  test(`${role} cannot enter the management route`, async ({ page }) => {
    await signIn(page, role);
    await expect(
      page.getByRole("link", { name: "Central de gestão", exact: true }),
    ).toHaveCount(0);
    await page.goto("/plataforma/gestao");
    await expect(page).toHaveURL(/\/app\/[^/]+\/conversas$/);
    await expect(
      page.getByRole("heading", { name: "Central de gestão", exact: true }),
    ).toHaveCount(0);
  });
