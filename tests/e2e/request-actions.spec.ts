import { randomUUID } from "node:crypto";
import { test, expect } from "@playwright/test";
import { Browser } from "../integration/helpers";

test("request actions assign, resend and reject in cards and table with one status", async ({
  page,
}) => {
  test.setTimeout(60000);
  const fixture = new Browser(),
    global = new Browser();
  const email = `request-ui-${randomUUID()}@fixture.example.test`;
  const name = "Solicitante E2E";
  expect(
    (
      await fixture.call("/access-requests", "POST", {
        name,
        email,
        organization: "Empresa informada",
      })
    ).status,
  ).toBe(202);
  expect((await global.login("global@marketanalysis.com")).status).toBe(200);
  const request = (
    await global.call(`/platform/access-requests?search=${email}`)
  ).data.items[0];
  try {
    await page.goto("/login");
    await page.getByRole("combobox").selectOption("pt-BR");
    await page
      .getByRole("textbox", { name: "E-mail corporativo" })
      .fill("global@marketanalysis.com");
    await page.locator("input[type=password]").fill("MarketGlobal#2027");
    await page.getByRole("button", { name: "Entrar", exact: true }).click();
    await page
      .getByRole("link", { name: "Solicitações de acesso", exact: true })
      .click();
    await expect(
      page.getByRole("heading", {
        name: "Solicitações de acesso",
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole("textbox", { name: "Buscar", exact: true })
      .fill(email);
    await page.getByRole("button", { name: "Cards", exact: true }).click();
    const list = page.getByRole("list", {
      name: "Solicitações de acesso",
      exact: true,
    });
    await expect(list.locator(".badge")).toHaveText(["Pendente"]);
    await expect(list).toContainText("Sem agência atribuída");
    const chevronGap = await page
      .locator(".table-toolbar .request-select")
      .evaluate((element) => {
        const select = element.querySelector("select")!.getBoundingClientRect();
        const svg = element.querySelector("svg")!.getBoundingClientRect();
        return select.right - svg.right;
      });
    expect(chevronGap).toBeGreaterThanOrEqual(12);
    async function actions() {
      await page
        .getByRole("button", { name: `Ações de ${name}`, exact: true })
        .click();
      await expect(page.getByRole("menuitem")).toHaveText([
        "Reenviar e-mail",
        "Editar",
        "Rejeitar",
      ]);
    }
    await actions();
    await expect(
      page.getByRole("menuitem", { name: "Reenviar e-mail", exact: true }),
    ).toBeDisabled();
    await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
    const dialog = page.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "Agência", exact: true })
      .selectOption({ label: "Agência Demo A" });
    await dialog
      .getByRole("combobox", { name: "Cliente", exact: true })
      .selectOption({ label: "Aurora" });
    await expect(
      dialog
        .getByRole("combobox", { name: "Cliente", exact: true })
        .locator("option"),
    ).not.toContainText(["Atlas"]);
    await dialog
      .getByRole("button", { name: "Aprovar e convidar", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(list.locator(".badge")).toHaveText(["Aprovado"]);
    await expect(list).toContainText("Agência Demo A");
    await expect(list).not.toContainText("Empresa informada");
    await page.getByRole("button", { name: "Tabela", exact: true }).click();
    await expect(
      page.getByRole("columnheader", { name: "Nome da agência", exact: true }),
    ).toBeVisible();
    const row = page.getByRole("row").filter({ hasText: email });
    await expect(row.locator(".badge")).toHaveText(["Aprovado"]);
    await actions();
    const sent = page.waitForResponse(
      (r) =>
        r.url().endsWith(`/access-requests/${request.id}/resend`) &&
        r.request().method() === "POST",
    );
    await page
      .getByRole("menuitem", { name: "Reenviar e-mail", exact: true })
      .click();
    expect((await sent).status()).toBe(201);
    await actions();
    await page.getByRole("menuitem", { name: "Editar", exact: true }).click();
    await dialog
      .getByRole("combobox", { name: "Agência", exact: true })
      .selectOption({ label: "Agência Demo B" });
    await expect(
      dialog.getByRole("combobox", { name: "Cliente", exact: true }),
    ).toHaveValue("");
    await expect(
      dialog.getByRole("button", { name: "Salvar alterações", exact: true }),
    ).toBeDisabled();
    await dialog
      .getByRole("combobox", { name: "Cliente", exact: true })
      .selectOption({ label: "Atlas" });
    await dialog
      .getByRole("button", { name: "Salvar alterações", exact: true })
      .click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toContainText("Agência Demo B");
    await expect(row).toContainText("Atlas");
    await actions();
    await page.getByRole("menuitem", { name: "Rejeitar", exact: true }).click();
    await dialog.getByRole("button", { name: "Cancelar", exact: true }).click();
    await expect(row).toBeVisible();
    await actions();
    await page.getByRole("menuitem", { name: "Rejeitar", exact: true }).click();
    await dialog.getByRole("button", { name: "Rejeitar", exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(row).toHaveCount(0);
    await page
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("rejected");
    await expect(row.locator(".badge")).toHaveText(["Rejeitado"]);
    await page.getByRole("button", { name: "Cards", exact: true }).click();
    await expect(list.locator(".badge")).toHaveText(["Rejeitado"]);
    await actions();
    for (const action of ["Reenviar e-mail", "Editar", "Rejeitar"])
      await expect(
        page.getByRole("menuitem", { name: action, exact: true }),
      ).toBeDisabled();
    await page.keyboard.press("Escape");
    await page
      .getByRole("combobox", { name: "Status", exact: true })
      .selectOption("");
    await expect(list).toHaveCount(0);
    await page.reload();
    await page
      .getByRole("textbox", { name: "Buscar", exact: true })
      .fill(email);
    await expect(
      page.getByRole("button", { name: `Ações de ${name}`, exact: true }),
    ).toHaveCount(0);
  } finally {
    await global.call(
      `/platform/access-requests/${request.id}/review`,
      "POST",
      { decision: "rejected" },
    );
  }
});
