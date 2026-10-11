import { test, expect } from "@playwright/test";

test.use({ locale: "pt-BR", reducedMotion: "no-preference" });

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ma.locale", "pt-BR"));
  await page.route("**/api/v1/auth/session", (route) =>
    route.fulfill({ status: 401, json: { code: "UNAUTHENTICATED" } }),
  );
});

test("plays the supplied SVG before revealing login and does not replay on a return visit", async ({
  page,
}) => {
  await page.goto("/entrar");
  const intro = page.locator(".login-intro");
  const email = page.getByRole("textbox", { name: "E-mail corporativo" });
  await expect(intro).toBeVisible();
  await expect(page.locator(".login-entrance")).toHaveAttribute(
    "data-phase",
    "playing",
  );
  // Verify the vector is drawing, not just fading a completed image in/out.
  await expect(page.locator(".login-intro-logo .L6")).toHaveCSS("opacity", "0");
  await expect(page.locator(".login-intro-logo .D8")).toHaveCSS(
    "stroke-dashoffset",
    "1px",
  );
  await expect(email).toBeHidden();
  await page.keyboard.press("Tab");
  await expect(
    page.getByRole("button", { name: "Pular introdução" }),
  ).toBeFocused();
  await expect(page.locator(".login-intro-logo .L6")).toHaveCSS("opacity", "1");
  await expect(page.locator(".login-intro-logo .D8")).toHaveCSS(
    "stroke-dashoffset",
    "0px",
  );
  await expect(page.locator(".login-entrance")).toHaveAttribute(
    "data-phase",
    "holding",
  );
  await expect(intro).toHaveCount(0, { timeout: 6500 });
  await expect(email).toBeVisible();
  await email.fill("test@example.test");
  await page.keyboard.press("Tab");
  await expect(page.locator("input[type=password]")).toBeFocused();

  await page.getByRole("link", { name: "Esqueceu a senha?" }).click();
  await page.getByRole("link", { name: "Voltar para o login" }).click();
  await expect(email).toBeVisible();
  await expect(intro).toHaveCount(0);
  await page.reload();
  await expect(intro).toBeVisible();
  await expect(page.locator(".login-intro-logo .L6")).toHaveCSS("opacity", "0");
  await expect(page.locator(".login-intro-logo .D8")).toHaveCSS(
    "stroke-dashoffset",
    "1px",
  );
});

test("allows skipping the intro on mobile without overflow", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/entrar");
  await expect(page.locator(".login-intro")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Pular introdução" }).click();
  await expect(page.locator(".login-intro")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "E-mail corporativo" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.body.style.overflow)).toBe("");
});

test("skips the intro for reduced motion, including a preference change during playback", async ({
  page,
}) => {
  await page.goto("/entrar");
  await expect(page.locator(".login-intro")).toBeVisible();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator(".login-intro")).toHaveCount(0);
  await expect(
    page.getByRole("textbox", { name: "E-mail corporativo" }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "E-mail corporativo" }),
  ).toBeVisible();
  await expect(page.locator(".login-intro")).toHaveCount(0);
});

test("keeps login available if vector animation events are interrupted", async ({
  page,
}) => {
  await page.addInitScript(() => {
    document.addEventListener(
      "animationend",
      (event) => event.stopImmediatePropagation(),
      true,
    );
  });
  await page.goto("/entrar");
  await expect(page.locator(".login-intro")).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: "E-mail corporativo" }),
  ).toBeVisible({ timeout: 7000 });
  await expect(page.locator(".login-intro")).toHaveCount(0);
});
