import { test, expect, type Page } from "@playwright/test";
import { switchWorkspace } from "./workspace";

test.afterEach(async ({ page }) => {
  await page.unrouteAll({ behavior: "wait" });
});

async function login(page: Page, role = "user") {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill(`${role}@marketanalysis.com`);
  await page.locator('input[type="password"]').fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.locator(".language select").selectOption("pt-BR");
  await switchWorkspace(page, "Aurora");
  const skip = page.getByRole("button", { name: "Agora não" });
  if (await skip.isVisible()) await skip.click();
}

for (const role of ["global", "user"]) {
  test(`${role} can draft while AI is unavailable and send after reconnecting`, async ({
    page,
  }) => {
    let unavailable = true;
    let posts = 0;
    await page.route(
      /\/api\/v1\/tenants\/[^/]+\/conversations$/,
      async (route) => {
        if (route.request().method() !== "GET") return route.continue();
        const response = await route.fetch();
        const data = await response.json();
        await route.fulfill({
          response,
          json: {
            ...data,
            ...(unavailable ? { provider: "unavailable" } : {}),
          },
        });
      },
    );
    page.on("request", (req) => {
      if (
        req.method() === "POST" &&
        /\/conversations(?:\/[^/]+\/messages)?$/.test(
          new URL(req.url()).pathname,
        )
      )
        posts++;
    });
    await login(page, role);
    const input = page.getByRole("textbox", { name: "Escreva sua pergunta…" });
    const submit = page.getByRole("button", { name: "Enviar mensagem" });
    await expect(page.locator("#chat-connection")).toContainText(
      "Você pode continuar escrevendo.",
    );
    await expect(input).toBeEditable();
    const content = `Rascunho recuperável ${role} ${Date.now()}`;
    await input.pressSequentially(content);
    await input.press("Shift+Enter");
    await input.pressSequentially("Segunda linha");
    await input.press("Enter");
    await expect(input).toHaveValue(content + "\nSegunda linha");
    await expect(submit).toBeDisabled();
    expect(posts).toBe(0);

    const settings = page.getByRole("link", {
      name: "Abrir configurações em outra aba",
    });
    if (role === "global") {
      await expect(settings).toHaveAttribute(
        "href",
        "/plataforma/configuracoes-ia",
      );
      await expect(settings).toHaveAttribute("target", "_blank");
    } else {
      await expect(settings).toHaveCount(0);
      await expect(page.locator("#chat-connection")).toContainText(
        "peça ao administrador",
      );
    }
    unavailable = false;
    await page.getByRole("button", { name: "Verificar conexão" }).click();
    await expect(page.locator("#chat-connection")).toHaveCount(0);
    await expect(input).toHaveValue(content + "\nSegunda linha");
    await expect(submit).toBeEnabled();
    await input.press("Enter");
    await expect(page.locator(".chat-message.user")).toContainText(content);
    await expect(page.locator(".chat-message.assistant")).toContainText(
      "Não consultei dados de mercado",
      { timeout: 20000 },
    );
    await expect(input).toBeEditable();
    await input.fill("Posso continuar escrevendo após a resposta.");
    await expect(submit).toBeEnabled();
    expect(posts).toBe(2);
  });
}

test("draft survives streaming, cancellation and switching conversations", async ({
  page,
}) => {
  let sends = 0;
  page.on("request", (req) => {
    if (req.method() === "POST" && /\/messages$/.test(req.url())) sends++;
  });
  await login(page);
  const input = page.getByRole("textbox", { name: "Escreva sua pergunta…" });
  const content = `E2E digitação durante resposta ${Date.now()}`;
  await input.fill(content);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(
    page.getByRole("button", { name: "Interromper resposta" }),
  ).toBeVisible();
  await expect(page.locator(".chat-message.user")).toContainText(content);
  await input.fill("Rascunho durante a resposta");
  await page.getByRole("button", { name: "Interromper resposta" }).click();
  await expect(
    page.getByRole("button", { name: "Enviar mensagem" }),
  ).toBeEnabled();
  await expect(input).toHaveValue("Rascunho durante a resposta");
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await input.fill("Rascunho da nova conversa");
  await page.getByRole("button", { name: content, exact: true }).click();
  await expect(input).toHaveValue("Rascunho durante a resposta");
  await page.getByRole("button", { name: "Nova conversa" }).click();
  await expect(input).toHaveValue("Rascunho da nova conversa");
  expect(sends).toBe(1);
});

test("typing while a new conversation is being created keeps the next draft", async ({
  page,
}) => {
  await login(page);
  let release!: () => void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  await page.route(
    /\/api\/v1\/tenants\/[^/]+\/conversations$/,
    async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      const response = await route.fetch();
      await gate;
      await route.fulfill({ response });
    },
  );
  const input = page.getByRole("textbox", { name: "Escreva sua pergunta…" });
  const content = `E2E criação lenta ${Date.now()}`;
  await input.fill(content);
  await page.getByRole("button", { name: "Enviar mensagem" }).click();
  await expect(input).toHaveValue("");
  await input.fill("Próxima mensagem durante a criação");
  release();
  await expect(page.locator(".chat-message.user")).toContainText(content);
  await expect(input).toHaveValue("Próxima mensagem durante a criação");
  await page.getByRole("button", { name: "Interromper resposta" }).click();
  await expect(
    page.getByRole("button", { name: "Enviar mensagem" }),
  ).toBeEnabled();
  await expect(input).toHaveValue("Próxima mensagem durante a criação");
});
