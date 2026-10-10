import { test, expect } from "@playwright/test";
import { mkdir } from "node:fs/promises";
test("auth visual matrix, system-dark default and supplied-video fallbacks", async ({
  browser,
  browserName,
}) => {
  test.setTimeout(120000);
  await mkdir("output/playwright/visual", { recursive: true });
  for (const width of [390, 768, 1440])
    for (const locale of ["pt-BR", "en", "es"])
      for (const theme of ["light", "dark"]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 1000 },
          locale,
          colorScheme: "dark",
          reducedMotion: "reduce",
        });
        await context.addInitScript(
          ({ locale, theme }) => {
            localStorage.setItem("ma.locale", locale);
            localStorage.setItem("ma.theme", theme);
          },
          { locale, theme },
        );
        const page = await context.newPage();
        for (const path of ["login", "solicitar-acesso"]) {
          await page.goto("/" + path);
          await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
          await page.evaluate(() => document.fonts.ready);
          await expect(page.locator("html")).toHaveAttribute(
            "data-theme",
            theme,
          );
          await expect(page.locator("html")).toHaveAttribute("lang", locale);
          expect(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          ).toBe(true);
          const font = await page
            .getByRole("heading", { level: 1 })
            .evaluate((e) => getComputedStyle(e).fontFamily);
          expect(font).toContain("Montserrat");
          expect(await page.locator("video").count()).toBe(0);
          if (browserName === "chromium")
            await page.screenshot({
              path: `output/playwright/visual/${path}-${width}-${locale}-${theme}.png`,
              fullPage: true,
            });
        }
        await context.close();
      }
  const context = await browser.newContext({
    colorScheme: "dark",
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  await page.goto("/login");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await context.close();
});
