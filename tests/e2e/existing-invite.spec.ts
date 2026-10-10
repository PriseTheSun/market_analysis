import { test, expect } from "@playwright/test";
import { Browser, mailToken } from "../integration/helpers";
test("existing invited identity signs in and accepts without replacing its password or other tenants", async ({
  page,
}) => {
  const admin = new Browser();
  expect((await admin.login("admin@marketanalysis.com")).status).toBe(200);
  const tenant = (await admin.call("/contexts")).data.find(
    (t: { name: string }) => t.name === "Aurora",
  ).id;
  const since = Date.now();
  const invite = await admin.call(`/tenants/${tenant}/invitations`, "POST", {
    email: "user@marketanalysis.com",
    role: "USER",
  });
  expect(invite.status).toBe(201);
  // Resend also makes this fixture retryable after a failed browser run.
  await admin.call(
    `/tenants/${tenant}/invitations/${invite.data.id}/resend`,
    "POST",
    {},
  );
  const token = await mailToken("user@marketanalysis.com", "invitation", since);
  await page.goto("/aceitar-convite#token=" + token);
  await page.getByRole("combobox").selectOption("pt-BR");
  await page.getByRole("link", { name: "Entrar com minha conta" }).click();
  await expect(
    page.getByRole("heading", { name: "Bem-vindo de volta" }),
  ).toBeVisible();
  await page
    .getByRole("textbox", { name: "E-mail corporativo" })
    .fill("user@marketanalysis.com");
  await page.locator("input[type=password]").fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page).toHaveURL(/aceitar-convite/);
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  await page
    .getByRole("button", { name: "Aceitar convite", exact: true })
    .click();
  await expect(
    page.getByText("Convite aceito. Seu acesso está pronto."),
  ).toBeVisible();
  const identity = new Browser();
  expect((await identity.login("user@marketanalysis.com")).status).toBe(200);
  expect((await identity.call("/contexts")).data).toHaveLength(4);
});
