import { test, expect } from "@playwright/test";
import { mailToken } from "../integration/helpers";
test("public request → global classification → approval → local email → new account acceptance", async ({
  page,
  browser,
}) => {
  test.setTimeout(60000);
  const email = "journey-" + Date.now() + "@example.test";
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("link", { name: "Solicitar acesso", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Nome completo" })
    .fill("Pessoa da jornada");
  await page.getByRole("textbox", { name: "E-mail corporativo" }).fill(email);
  await page
    .getByRole("textbox", { name: "Nome da agência ou cliente" })
    .fill("Cliente independente");
  await page.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(
    page.getByRole("heading", { name: "Solicitação recebida" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar para o login" }).click();
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("global@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await page
    .getByRole("link", { name: "Solicitações de acesso", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Solicitações de acesso", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Tabela", exact: true }).click();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(email);
  await page
    .getByRole("row")
    .filter({ hasText: email })
    .getByRole("button", { name: "Ações de Pessoa da jornada", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("combobox", { name: "Agência", exact: true })
    .selectOption({ label: "Agência Demo A" });
  await dialog
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ label: "Aurora" });
  await expect(
    dialog.getByRole("combobox", { name: "Perfil", exact: true }),
  ).toHaveValue("USER");
  await dialog.getByRole("button", { name: "Aprovar e convidar" }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: email })
      .getByText("Aprovado", { exact: true }),
  ).toBeVisible();
  const token = await mailToken(email, "invitation");
  const context = await browser.newContext({ locale: "pt-BR" });
  const invited = await context.newPage();
  await invited.goto("/aceitar-convite#token=" + token);
  await invited
    .getByRole("textbox", { name: "Nome completo" })
    .fill("Pessoa da jornada");
  await invited.locator("input[type=password]").fill("JourneyAccess#2027");
  await invited.getByRole("button", { name: "Aceitar convite" }).click();
  await expect(
    invited.getByText("Convite aceito. Seu acesso está pronto."),
  ).toBeVisible();
  await invited.getByRole("link", { name: "Voltar para o login" }).click();
  await invited
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill(email);
  await invited.locator("input[type=password]").fill("JourneyAccess#2027");
  await invited.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(invited).toHaveURL(/\/conversas$/);
  await expect(
    invited.getByRole("link", { name: "Membros", exact: true }),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("heading", { name: "Solicitações de acesso", exact: true })
    .waitFor();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(email);
  await page
    .getByRole("button", { name: "Ações de Pessoa da jornada", exact: true })
    .click();
  for (const name of ["Reenviar e-mail", "Editar", "Rejeitar"]) {
    await expect(
      page.getByRole("menuitem", { name, exact: true }),
    ).toBeDisabled();
  }
  await expect(
    page.getByText(
      "Convite já aceito. Gerencie os vínculos do usuário na Central de gestão.",
      { exact: true },
    ),
  ).toBeVisible();
  await context.close();
});
