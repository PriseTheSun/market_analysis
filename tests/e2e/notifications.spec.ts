import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { test, expect } from "@playwright/test";

const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const createdUsers: string[] = [];
const createdTenants: string[] = [];
const createdAgencies: string[] = [];
test.afterAll(async () => {
  if (createdUsers.length)
    await owner.query(
      'UPDATE "User" SET active=false WHERE id=ANY($1::uuid[])',
      [createdUsers],
    );
  if (createdTenants.length)
    await owner.query(
      "UPDATE \"Tenant\" SET status='disabled' WHERE id=ANY($1::uuid[])",
      [createdTenants],
    );
  if (createdAgencies.length)
    await owner.query(
      'UPDATE "Agency" SET active=false WHERE id=ANY($1::uuid[])',
      [createdAgencies],
    );
  await owner.end();
});

test("reading clears paginated inbox and bell, persists, and keeps other scopes intact", async ({
  page,
}) => {
  const userId = randomUUID(),
    otherId = randomUUID();
  const email = `notifications-${userId}@fixture.example.test`;
  const hash = (
    await owner.query('SELECT "passwordHash" FROM "User" WHERE email=$1', [
      "user@marketanalysis.com",
    ])
  ).rows[0].passwordHash;
  const tenantId = randomUUID(),
    otherTenantId = randomUUID(),
    agencyId = randomUUID();
  const targetTenant = tenantId;
  await owner.query(
    'INSERT INTO "Agency" (id,name,slug,"updatedAt") VALUES ($1,$2,$3,now())',
    [agencyId, "Notification fixture", `notifications-${agencyId}`],
  );
  createdAgencies.push(agencyId);
  for (const id of [tenantId, otherTenantId]) {
    await owner.query(
      'INSERT INTO "Tenant" (id,"agencyId",name,slug,status,"updatedAt") VALUES ($1,$2,$3,$4,\'active\',now())',
      [id, agencyId, "Notification fixture", `notifications-${id}`],
    );
    createdTenants.push(id);
  }
  for (const id of [userId, otherId]) {
    await owner.query(
      'INSERT INTO "User" (id,email,name,"passwordHash","updatedAt") VALUES ($1,$2,$3,$4,now())',
      [
        id,
        id === userId ? email : `notifications-${id}@fixture.example.test`,
        "Notification E2E",
        hash,
      ],
    );
    createdUsers.push(id);
    for (const tenant of [tenantId, otherTenantId])
      await owner.query(
        'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,\'USER\',now())',
        [randomUUID(), tenant, id],
      );
  }
  async function add(recipient: string, tenant: string | null, read = false) {
    const id = randomUUID();
    await owner.query(
      'INSERT INTO "Notification" (id,"recipientId","tenantId",type,parameters,"eventKey","readAt") VALUES ($1,$2,$3,\'membership.changed\',\'{}\'::jsonb,$5,$4)',
      [id, recipient, tenant, read ? new Date() : null, id],
    );
    return id;
  }
  const ownIds = [];
  for (let i = 0; i < 14; i++) ownIds.push(await add(userId, targetTenant));
  await add(userId, targetTenant, true);
  const otherScope = await add(userId, otherTenantId);
  const otherRecipient = await add(otherId, targetTenant);

  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page.getByRole("textbox", { name: "E-mail corporativo" }).fill(email);
  await page.locator('input[type="password"]').fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.goto(`/app/${tenantId}/notificacoes`);
  await expect(page.locator(".notification-list li")).toHaveCount(12);
  await expect(page.locator(".notification-count")).toHaveText("14");
  await page.getByRole("button", { name: "Próxima", exact: true }).click();
  await expect(page.locator(".notification-list li")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Marcar como lida", exact: true })
    .first()
    .click();
  await expect(page.locator(".notification-list li")).toHaveCount(1);
  await expect(page.locator(".notification-count")).toHaveText("13");
  const all = page.getByRole("button", {
    name: "Marcar todas como lidas",
    exact: true,
  });
  await all.click();
  await expect(page.locator(".notification-list li")).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Tudo em dia", exact: true }),
  ).toBeVisible();
  await expect(all).toBeDisabled();
  await expect(page.locator(".notification-count")).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Próxima", exact: true }),
  ).toHaveCount(0);
  await page.locator(".notification-bell").click();
  await expect(page.locator(".notification-popover")).toContainText(
    "Tudo em dia",
  );
  await expect(page.locator(".notification-popover .unread")).toHaveCount(0);
  await page.keyboard.press("Escape");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Tudo em dia", exact: true }),
  ).toBeVisible();
  await expect(all).toBeDisabled();
  await expect(page.locator(".notification-list li")).toHaveCount(0);
  const stored = (
    await owner.query(
      'SELECT "readAt" FROM "Notification" WHERE id=ANY($1::uuid[])',
      [ownIds],
    )
  ).rows;
  expect(stored).toHaveLength(14);
  expect(stored.every((row) => row.readAt !== null)).toBe(true);
  const untouched = (
    await owner.query(
      'SELECT "readAt" FROM "Notification" WHERE id=ANY($1::uuid[])',
      [[otherScope, otherRecipient]],
    )
  ).rows;
  expect(untouched.every((row) => row.readAt === null)).toBe(true);

  await add(userId, targetTenant);
  await page.reload();
  await expect(page.locator(".notification-list li")).toHaveCount(1);
  await expect(page.locator(".notification-count")).toHaveText("1");
  await expect(all).toBeEnabled();
});
