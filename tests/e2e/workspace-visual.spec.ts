import { switchWorkspace } from "./workspace";
import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("workspace matrix and independent accessible controls", async ({
  page,
  browserName,
}) => {
  test.setTimeout(120000);
  await mkdir("output/playwright/visual", { recursive: true });
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("admin@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/\/app\/[^/]+\/conversas$/);
  await switchWorkspace(page, "Aurora");
  const path = page.url().replace(/chat$/, "");
  const skip = page.getByRole("button", { name: "Agora não" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  if (await skip.isVisible()) await skip.click();
  for (const width of [390, 768, 1440])
    for (const locale of ["pt-BR", "en", "es"])
      for (const theme of ["light", "dark"]) {
        await page.setViewportSize({
          width,
          height: width === 390 ? 844 : 1000,
        });
        await page.goto(path + "preferences");
        await page.evaluate(
          async ({ locale, theme }) => {
            const { token } = await (await fetch("/api/v1/auth/csrf")).json();
            await fetch("/api/v1/preferences", {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": token,
              },
              body: JSON.stringify({ locale, theme }),
            });
          },
          { locale, theme },
        );
        await page.reload();
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        await expect(page.locator("html")).toHaveAttribute("lang", locale);
        for (const route of ["chat", "files", "members"]) {
          await page.goto(path + route);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          expect(
            await page.evaluate(() => ({
              width: innerWidth,
              scroll: document.documentElement.scrollWidth,
              offenders: [...document.querySelectorAll("*")]
                .filter(
                  (e) =>
                    e.getBoundingClientRect().right > innerWidth + 1 &&
                    e.getBoundingClientRect().width > 0,
                )
                .slice(0, 12)
                .map((e) => ({
                  tag: e.tagName,
                  class: e.className,
                  width: e.getBoundingClientRect().width,
                  right: e.getBoundingClientRect().right,
                })),
            })),
            `${route} ${width} ${locale} ${theme}`,
          ).toMatchObject({ width, scroll: width });
          if (
            browserName === "chromium" &&
            ((width === 390 && locale === "es" && theme === "dark") ||
              (width === 768 && locale === "en" && theme === "light") ||
              (width === 1440 && locale === "pt-BR" && theme === "light"))
          )
            await page.screenshot({
              path: `output/playwright/visual/${route}-${width}-${locale}-${theme}.png`,
              fullPage: true,
            });
        }
      }
  await page.evaluate(async () => {
    const { token } = await (await fetch("/api/v1/auth/csrf")).json();
    await fetch("/api/v1/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", "X-CSRF-Token": token },
      body: JSON.stringify({ locale: "pt-BR", theme: "light" }),
    });
  });
});
