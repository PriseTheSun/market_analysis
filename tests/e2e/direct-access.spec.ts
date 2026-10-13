import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { test, expect } from "@playwright/test";
import { Browser } from "../integration/helpers";

const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const operatorId = randomUUID();
const operatorEmail = `direct-operator-${operatorId}@fixture.example.test`;
test.beforeAll(async () => {
  // A dedicated test operator avoids consuming the seed account's login window.
  const { rows } = await owner.query(
    'SELECT "passwordHash" FROM "User" WHERE email=$1',
    ["global@marketanalysis.com"],
  );
  await owner.query(
    'INSERT INTO "User" (id,email,name,"passwordHash","platformRole","updatedAt") VALUES ($1,$2,$3,$4,\'GLOBAL\',now())',
    [
      operatorId,
      operatorEmail,
      "Direct access E2E operator",
      rows[0].passwordHash,
    ],
  );
});
test.afterAll(async () => {
  await owner.query(
    'UPDATE "User" SET active=false, "archivedAt"=now() WHERE id=$1',
    [operatorId],
  );
  await owner.query(
    'UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=$1 AND "revokedAt" IS NULL',
    [operatorId],
  );
  await owner.end();
});

for (const role of ["USER", "ADMIN"] as const) {
  test(`Global creates a direct-access ${role} with its own permission and immediate login`, async ({
    page,
    browser,
  }, testInfo) => {
    test.setTimeout(60000);
    const email = `direct-ui-${randomUUID()}@fixture.example.test`;
    const password = "DirectAccessUI#2027";
    const global = new Browser();
    expect((await global.login(operatorEmail)).status).toBe(200);
    try {
      await page.goto("/login");
      await page.getByRole("combobox").selectOption("pt-BR");
      await page
        .getByRole("textbox", { name: "E-mail corporativo" })
        .fill(operatorEmail);
      await page.getByLabel("Senha", { exact: true }).fill("MarketGlobal#2027");
      await page.getByRole("button", { name: "Entrar", exact: true }).click();
      await page
        .getByRole("link", { name: "Central de gestão", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Criar usuário", exact: true })
        .click();
      const dialog = page.getByRole("dialog");
      const toggle = dialog.getByRole("switch", { name: "Acesso direto" });
      await expect(toggle).not.toBeChecked();
      await expect(
        dialog.getByText(/receberá por e-mail um link/),
      ).toBeVisible();
      await expect(dialog.getByLabel("Senha", { exact: true })).toHaveCount(0);
      await toggle.click();
      await expect(toggle).toBeChecked();
      await expect(dialog.getByText(/receberá por e-mail um link/)).toHaveCount(
        0,
      );
      await dialog
        .getByLabel("Senha", { exact: true })
        .fill("DiscardedPassword#2027");
      await toggle.click();
      await toggle.click();
      await expect(dialog.getByLabel("Senha", { exact: true })).toHaveValue("");
      await dialog
        .getByRole("textbox", { name: "Nome completo", exact: true })
        .fill("Usuário de acesso direto");
      await dialog
        .getByRole("textbox", { name: "E-mail", exact: true })
        .fill(email);
      await dialog
        .getByRole("button", { name: "Criar usuário", exact: true })
        .click();
      await expect(dialog.getByLabel("Senha", { exact: true })).toHaveAttribute(
        "aria-invalid",
        "true",
      );
      await dialog.getByLabel("Senha", { exact: true }).fill(password);
      const level = dialog.getByRole("combobox", {
        name: "Nível de permissão",
        exact: true,
      });
      await expect(level.locator("option")).toHaveText([
        "Global",
        "Super Admin",
        "Admin",
        "User",
      ]);
      await level.selectOption("GLOBAL");
      await expect(
        dialog.getByRole("button", { name: "Vincular cliente", exact: true }),
      ).toHaveCount(0);
      await level.selectOption("SUPER_ADMIN");
      await expect(
        dialog.getByRole("combobox", { name: "Agência", exact: true }),
      ).toBeVisible();
      await level.selectOption(role === "USER" ? "ADMIN" : "USER");
      await dialog
        .getByRole("button", { name: "Vincular cliente", exact: true })
        .click();
      await dialog
        .getByRole("combobox", { name: "Agência", exact: true })
        .selectOption({ label: "Agência Demo A" });
      await dialog
        .getByRole("combobox", { name: "Cliente da agência", exact: true })
        .selectOption({ label: "Aurora" });
      await expect(
        dialog.getByRole("combobox", {
          name: "Permissão de acesso",
          exact: true,
        }),
      ).toHaveCount(0);
      // Changing the selected level must also update the role of links already added.
      await level.selectOption(role);
      const created = page.waitForResponse(
        (r) =>
          r.url().endsWith("/platform/management/users") &&
          r.request().method() === "POST",
      );
      await dialog
        .getByRole("button", { name: "Criar usuário", exact: true })
        .click();
      const response = await created;
      expect(response.status()).toBe(201);
      const user = await response.json();
      expect(user.platformRole).toBeNull();
      expect(user.agencies).toHaveLength(0);
      expect(user.tenants).toHaveLength(1);
      expect(user.tenants[0].role).toBe(role);
      await expect(dialog).toHaveCount(0);
      await page
        .getByRole("textbox", { name: "Buscar", exact: true })
        .fill(email);
      await page
        .getByRole("button", {
          name: `Usuário de acesso direto ${email}`,
          exact: true,
        })
        .click();
      await expect(
        dialog.getByRole("switch", { name: "Acesso direto" }),
      ).toHaveCount(0);
      await expect(dialog.getByLabel("Senha", { exact: true })).toHaveCount(0);
      await dialog
        .getByRole("button", { name: "Cancelar", exact: true })
        .click();

      const context = await browser.newContext();
      const newUser = await context.newPage();
      try {
        await newUser.goto(
          `${testInfo.project.use.baseURL ?? process.env.BASE_URL ?? "http://localhost:8080"}/login`,
        );
        await newUser.getByRole("combobox").selectOption("pt-BR");
        await newUser
          .getByRole("textbox", { name: "E-mail corporativo" })
          .fill(email);
        await newUser.getByLabel("Senha", { exact: true }).fill(password);
        const login = newUser.waitForResponse((r) =>
          r.url().endsWith("/auth/login"),
        );
        await newUser
          .getByRole("button", { name: "Entrar", exact: true })
          .click();
        expect((await login).status()).toBe(200);
        await expect(
          newUser.getByRole("button", { name: "Trocar espaço", exact: true }),
        ).toContainText("Aurora");
        await expect(
          newUser.getByRole("link", { name: "Central de gestão", exact: true }),
        ).toHaveCount(0);
      } finally {
        await context.close();
      }
    } finally {
      const users = (
        await global.call(`/platform/management/users?search=${email}`)
      ).data.items;
      for (const user of users)
        expect(
          (await global.call(`/platform/management/users/${user.id}`, "DELETE"))
            .status,
        ).toBe(200);
    }
  });
}
