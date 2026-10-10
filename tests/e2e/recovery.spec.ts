import { test, expect } from "@playwright/test";
import { mailToken } from "../integration/helpers";
test("password recovery email, single-use reset and authenticated return", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page.getByRole("link", { name: "Esqueceu a senha?" }).click();
  await expect(
    page.getByRole("heading", { name: "Recuperar senha" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("user@marketanalysis.com");
  const since = Date.now();
  await page.getByRole("button", { name: "Enviar instruções" }).click();
  await expect(
    page.getByText(
      "Se houver uma conta ativa para este e-mail, enviaremos as instruções de recuperação.",
    ),
  ).toBeVisible();
  const token = await mailToken("user@marketanalysis.com", "reset", since);
  await page.goto("/redefinir-senha#token=" + token);
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(
    page.getByText("Senha atualizada. Entre novamente para continuar."),
  ).toBeVisible();
  await page.getByRole("link", { name: "Voltar para o login" }).click();
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("user@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/[^/]+\/conversas$/);
});
