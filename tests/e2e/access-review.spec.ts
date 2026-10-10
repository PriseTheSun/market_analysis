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
    .getByRole("link", { name: "Administração global", exact: true })
    .click();
  await page
    .getByRole("link", { name: "Solicitações de acesso", exact: true })
    .click();
  await page.getByRole("textbox", { name: "Buscar", exact: true }).fill(email);
  await page
    .getByRole("row")
    .filter({ hasText: email })
    .getByRole("button", { name: "Ações de Pessoa da jornada", exact: true })
    .click();
  await page.getByRole("menuitem", { name: "Abrir", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Classificar" }).click();
  await dialog
    .getByRole("combobox", { name: "Cliente", exact: true })
    .selectOption({ label: "Agência Demo A · Aurora" });
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await dialog.getByRole("button", { name: "Aprovar e convidar" }).click();
  await expect(
    dialog.getByRole("combobox", { name: "Perfil", exact: true }),
  ).toHaveValue("USER");
  await dialog.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page
      .getByRole("row")
      .filter({ hasText: email })
      .getByText("Aprovada", { exact: true }),
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
  await context.close();
});
