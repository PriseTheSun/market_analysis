import { switchWorkspace } from "./workspace";
import { test, expect } from "@playwright/test";
test("supplied video pauses, reduced motion and network/autoplay failures preserve accessible form", async ({
  browser,
}) => {
  test.setTimeout(60000);
  for (const mode of ["normal", "saveData", "blocked", "failure"]) {
    const context = await browser.newContext({
      locale: "pt-BR",
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    const external: string[] = [];
    page.on("request", (r) => {
      if (!["localhost", "127.0.0.1"].includes(new URL(r.url()).hostname))
        external.push(r.url());
    });
    if (mode === "saveData")
      await context.addInitScript(() =>
        Object.defineProperty(navigator, "connection", {
          value: { saveData: true },
          configurable: true,
        }),
      );
    if (mode === "blocked")
      await context.addInitScript(() => {
        HTMLMediaElement.prototype.play = () =>
          Promise.reject(
            new DOMException("Autoplay blocked", "NotAllowedError"),
          );
      });
    if (mode === "failure")
      await page.route("**/auth-background.mp4", (r) => r.abort());
    await page.goto("/login");
    await expect(
      page.getByRole("textbox", { name: "E-mail corporativo" }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "E-mail corporativo" })
      .fill("keyboard@example.test");
    await page.keyboard.press("Tab");
    await expect(page.locator("input[type=password]")).toBeFocused();
    if (mode === "normal") {
      await expect(
        page.getByRole("button", { name: "Pausar vídeo" }),
      ).toBeVisible();
      await page.getByRole("button", { name: "Pausar vídeo" }).click();
      expect(
        await page.locator("video").evaluate((e: HTMLVideoElement) => e.paused),
      ).toBe(true);
      await page.getByRole("button", { name: "Reproduzir vídeo" }).click();
      await expect(
        page.getByRole("button", { name: "Pausar vídeo" }),
      ).toBeVisible();
      await page.evaluate(() => {
        Object.defineProperty(document, "hidden", {
          configurable: true,
          get: () => true,
        });
        document.dispatchEvent(new Event("visibilitychange"));
      });
      expect(
        await page.locator("video").evaluate((e: HTMLVideoElement) => e.paused),
      ).toBe(true);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await expect(page.locator("video")).toHaveCount(0);
    } else if (mode === "saveData" || mode === "failure")
      await expect(page.locator("video")).toHaveCount(0);
    else
      await expect(
        page.getByRole("button", { name: "Reproduzir vídeo" }),
      ).toBeVisible();
    expect(external).toEqual([]);
    await expect(
      page.getByRole("button", { name: "Entrar", exact: true }),
    ).toBeEnabled();
    await context.close();
  }
});
test("notification read state survives reload and Global audit has a separate read-only surface", async ({
  page,
}) => {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("admin@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/[^/]+\/conversas$/);
  await switchWorkspace(page, "Aurora");
  await page.getByRole("link", { name: "Notificações", exact: true }).click();
  const all = page.getByRole("button", { name: "Marcar todas como lidas" });
  await expect(all).toBeVisible();
  if (await all.isEnabled()) await all.click();
  await expect(all).toBeDisabled();
  await page.reload();
  await expect(all).toBeDisabled();
  await page.locator(".sidebar .platform-account-trigger").click();
  await page.getByRole("menuitem", { name: "Sair", exact: true }).click();
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("global@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/[^/]+\/conversas$/);
  await switchWorkspace(page, "Aurora");
  await page
    .getByRole("link", { name: "Consultar conversas", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Motivo" })
    .fill("Revisão autorizada de integração");
  await page.getByRole("button", { name: "Confirmar", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Abrir", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Abrir", exact: true })
    .first()
    .click();
  await expect(
    page.getByRole("button", { name: "Enviar mensagem" }),
  ).toHaveCount(0);
});
