import { expect, type Page } from "@playwright/test";

export async function switchWorkspace(page: Page, name: string) {
  await expect(page.locator(".app-shell")).toBeVisible();
  if (!(await page.locator(".scope-switch").first().isVisible()))
    await page.locator(".menu-toggle").click();
  await page.locator(".scope-switch:visible").click();
  await page.getByRole("menuitem").filter({ hasText: name }).click();
  await expect(page.locator(".scope-switch strong")).toHaveText(name);
}
