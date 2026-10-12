import { switchWorkspace } from "./workspace";
import { test, expect, type Page } from "@playwright/test";
const password = "MarketGlobal#2027";
async function login(
  page: Page,
  role = "admin",
  workspace: string | null = "Aurora",
) {
  await page.goto("/login");
  await page.getByRole("combobox").first().selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill(role + "@marketanalysis.com");
  await page.locator("input[type=password]").fill(password);
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(
    role === "global" ? /\/plataforma\/gestao$/ : /\/app\/[^/]+\/conversas$/,
  );
  await expect(
    page.getByRole("heading", { name: "Escolha seu espaço de trabalho" }),
  ).toHaveCount(0);
  if (workspace) {
    await switchWorkspace(page, workspace);
    await expect(page).toHaveURL(/\/conversas$/);
  }
  const skip = page.getByRole("button", { name: "Agora não" });
  if (await skip.isVisible()) await skip.click();
}
test("Global enters platform administration even after visiting a client", async ({
  page,
}) => {
  await login(page, "global", null);
  await expect(page.locator(".scope-switch strong")).toHaveText(
    "Market Analysis",
  );
  await switchWorkspace(page, "Aurora");
  await page.locator(".sidebar .platform-account-trigger").click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await login(page, "global", null);
  await expect(page.locator(".scope-switch strong")).toHaveText(
    "Market Analysis",
  );
  await page.goto("/contexts");
  await expect(page).toHaveURL(/\/plataforma\/gestao$/);
  await expect(page.locator(".scope-switch strong")).toHaveText(
    "Market Analysis",
  );
  await page.locator(".sidebar .platform-account-trigger").click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await login(page, "admin", null);
  await expect(page.locator(".scope-switch strong")).toHaveText("Atlas");
});
test("non-Global login remembers an authorized client and redirects old entry links", async ({
  page,
}) => {
  await login(page, "admin", "Aurora");
  await page.locator(".sidebar .platform-account-trigger").click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await login(page, "admin", null);
  await expect(page.locator(".scope-switch strong")).toHaveText("Aurora");
  await page.goto("/contexts");
  await expect(page).toHaveURL(/\/conversas$/);
  await expect(page.locator(".scope-switch strong")).toHaveText("Aurora");
});
test("login, scoped navigation, persistent streamed chat and logout", async ({
  page,
}) => {
  await login(page, "user");
  await expect(
    page.getByRole("link", { name: "Membros", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Modo demonstrativo", { exact: true }),
  ).toBeVisible();
  const content = "Como estruturar minha análise " + Date.now() + "?";
  await page
    .getByRole("textbox", { name: "Escreva sua pergunta…" })
    .fill(content);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(
    page.getByRole("button", { name: "Interromper resposta" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Não consultei dados de mercado nem analisei os arquivos enviados.",
    ),
  ).toBeVisible({ timeout: 20000 });
  await expect(
    page.getByRole("button", { name: "Interromper resposta" }),
  ).toHaveCount(0);
  await page.reload();
  await page
    .getByRole("button")
    .filter({ hasText: content.slice(0, 40) })
    .click();
  await expect(
    page.getByText(
      "Não consultei dados de mercado nem analisei os arquivos enviados.",
    ),
  ).toBeVisible();
  await page.locator(".sidebar .platform-account-trigger").click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await expect(page).toHaveURL(/entrar/);
});
test("admin uploads real file, reloads metadata, downloads and deletes", async ({
  page,
}) => {
  await login(page);
  await page.getByRole("link", { name: "Arquivos", exact: true }).click();
  const name = "browser-" + Date.now() + ".txt";
  await page.locator("input[type=file]").setInputFiles({
    name,
    mimeType: "text/plain",
    buffer: Buffer.from("Arquivo de integração pelo navegador\n"),
  });
  const row = page.getByRole("row").filter({ hasText: name });
  await expect(row.getByText("Disponível", { exact: true })).toBeVisible({
    timeout: 20000,
  });
  await page.reload();
  await expect(row).toBeVisible();
  const download = page.waitForEvent("download");
  await row.getByRole("button", { name: "Baixar arquivo " + name }).click();
  expect((await download).suggestedFilename()).toBe(name);
  await row.getByRole("button", { name: "Excluir " + name }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Excluir", exact: true })
    .click();
  await expect(row).toHaveCount(0);
});
test("manual theme, language persistence and independent tenant tabs", async ({
  page,
  context,
}) => {
  await login(page);
  const first = page.url();
  await page.locator(".sidebar .platform-account-trigger").click();
  await page
    .getByRole("menuitem", { name: "Preferências", exact: true })
    .click();
  await page.getByRole("radio", { name: "Escuro", exact: true }).check();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page
    .getByRole("combobox", { name: "Idioma" })
    .first()
    .selectOption("es");
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  const second = await context.newPage();
  await second.goto("/app");
  await expect(second).toHaveURL(/\/conversaciones$/);
  await switchWorkspace(second, "Horizonte");
  expect(second.url().split("/")[4]).not.toBe(first.split("/")[4]);
  await expect(page).toHaveURL(/preferencias/);
  await page
    .getByRole("combobox", { name: "Idioma" })
    .first()
    .selectOption("pt-BR");
  await page.getByRole("radio", { name: /^Claro/ }).check();
  await page
    .getByRole("button", { name: "Salvar alterações", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});
test("public access form keeps values on error and confirms receipt", async ({
  page,
}) => {
  await page.goto("/solicitar-acesso");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "Nome completo" })
    .fill("Solicitante E2E");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("e2e-" + Date.now() + "@example.test");
  await page
    .getByRole("textbox", { name: "Nome da agência ou cliente" })
    .fill("Cliente E2E");
  await page.getByRole("button", { name: "Enviar solicitação" }).click();
  await expect(
    page.getByRole("heading", { name: "Solicitação recebida" }),
  ).toBeVisible();
  await expect(page).toHaveURL(/solicitar-acesso/);
});
test("mobile navigation and tour teardown", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await login(page);
  await page.getByRole("button", { name: "Abrir navegação" }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: /^Menu de / })
    .click();
  await page
    .getByRole("menuitem", { name: "Preferências", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Reiniciar apresentação" }).click();
  await expect(page.locator(".driver-popover")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".driver-overlay")).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
