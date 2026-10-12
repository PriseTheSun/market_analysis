import { test, expect, type Page } from "@playwright/test";
import { randomUUID } from "node:crypto";
import type {
  AiSettings,
  AiUsage,
  AiCatalog,
  AiOperation,
} from "@market/contracts";
async function login(page: Page, email = "global@marketanalysis.com") {
  await page.goto("/login");
  await page.getByRole("combobox").selectOption("pt-BR");
  await page.getByRole("textbox", { name: "E-mail corporativo" }).fill(email);
  await page.locator('input[type="password"]').fill("MarketGlobal#2027");
  await page.getByRole("button", { name: "Entrar", exact: true }).click();
  await expect(page.locator(".app-shell")).toBeVisible();
  await page.locator(".language select").selectOption("pt-BR");
}
async function fixture(page: Page) {
  const disconnected = {
    status: "not_configured" as const,
    revision: null,
    expiresAt: null,
    errorCode: null,
  };
  const settings: AiSettings = {
    environment: "local",
    enabled: true,
    localTokenAllowed: true,
    serverTime: new Date().toISOString(),
    configuration: {
      scope: "local",
      exists: false,
      version: 0,
      source: "managed",
      connectionRevision: null,
      models: { chatText: null, imageGeneration: null },
      localPolicy: { warnAt80: true, pauseAtLimit: true },
    },
    connections: { managed: disconnected, temporary: disconnected },
  };
  const usage: AiUsage = {
    scope: "local",
    windowStart: new Date().toISOString(),
    resetsAt: new Date(Date.now() + 3600000).toISOString(),
    confirmed: 12480,
    reserved: 0,
    estimated: 0,
    input: 9600,
    output: 2880,
    thinking: 0,
    unknownOperations: 0,
    imageOperations: 0,
    tokenLimit: null,
    imageLimit: null,
    providerQuota: null,
    localPolicy: settings.configuration.localPolicy,
  };
  const catalog: AiCatalog = {
    source: "temporary",
    connectionRevision: randomUUID(),
    fetchedAt: new Date().toISOString(),
    models: [
      {
        id: "models/gemini-2.5-flash",
        label: "Gemini Flash",
        features: ["chatText"],
        inputTokenLimit: 10000,
        outputTokenLimit: 2048,
        strictBudgetSupported: true,
      },
      {
        id: "models/gemini-3.1-flash-image",
        label: "Gemini Image",
        features: ["imageGeneration"],
        inputTokenLimit: 10000,
        outputTokenLimit: 2048,
        strictBudgetSupported: false,
      },
    ],
  };
  const operations = new Map<string, AiOperation>();
  let generations = 0,
    connections = 0,
    reads = 0;
  await page.route("**/api/v1/ai/**", async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname,
      method = req.method();
    let data: unknown = { ok: true };
    if (path.endsWith("/settings")) {
      if (method === "PUT") {
        const input = req.postDataJSON();
        if (input.expectedVersion !== settings.configuration.version) {
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              code: "CONFLICT",
              message: "CONFLICT",
              requestId: randomUUID(),
            }),
          });
          return;
        }
        settings.configuration = {
          ...input,
          version: settings.configuration.version + 1,
          exists: true,
          localPolicy: { warnAt80: false, pauseAtLimit: false },
        };
        usage.localPolicy = settings.configuration.localPolicy;
      }
      data = settings;
    } else if (path.endsWith("/local-connection")) {
      if (method === "POST") {
        connections++;
        settings.connections.temporary = {
          status: "connected",
          revision: catalog.connectionRevision,
          expiresAt: new Date(Date.now() + 48 * 60000).toISOString(),
          errorCode: null,
        };
      } else
        settings.connections.temporary = { ...disconnected, status: "expired" };
      data = settings.connections.temporary;
    } else if (path.endsWith("/models")) data = catalog;
    else if (path.endsWith("/usage"))
      data =
        new URL(req.url()).searchParams.get("source") === "managed"
          ? {
              ...usage,
              scope: "managed",
              confirmed: 65000,
              input: 60000,
              output: 5000,
              tokenLimit: null,
              imageLimit: null,
            }
          : usage;
    else if (path.endsWith("/model-tests") && method === "POST") {
      generations++;
      const input = req.postDataJSON();
      const op: AiOperation = {
        id: input.operationId,
        feature: input.feature,
        modelId: input.modelId,
        status: "running",
        errorCode: null,
        text: null,
        previewAvailable: false,
        previewExpiresAt: null,
        usage: { input: null, output: null, thinking: null, total: null },
      };
      operations.set(op.id, op);
      data = op;
    } else {
      const id = path.split("/").at(-1)!;
      const op = operations.get(id);
      if (op) {
        if (method === "DELETE") op.status = "cancelled";
        else if (++reads >= 2) {
          op.status = "completed";
          op.text = "Conexão de teste funcionando.";
          op.usage = { input: 10, output: 5, thinking: 0, total: 15 };
        }
        data = op;
      }
    }
    await route.fulfill({
      status: method === "POST" && path.endsWith("/model-tests") ? 202 : 200,
      contentType: "application/json",
      headers: { "Cache-Control": "no-store" },
      body: JSON.stringify(data),
    });
  });
  return {
    settings,
    usage,
    catalog,
    counts: () => ({ generations, connections }),
  };
}
test("temporary connection: clear credential, draft/save, explicit test, local-only controls and languages", async ({
  page,
}) => {
  const state = await fixture(page);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  await page
    .getByRole("link", { name: "Configurações de IA", exact: true })
    .click();
  await expect(page).toHaveURL(/\/plataforma\/configuracoes-ia$/);
  expect(state.counts().generations).toBe(0);
  const secret = randomUUID();
  await page.getByLabel("Token da API Gemini", { exact: true }).fill(secret);
  await page.getByRole("button", { name: "Conectar", exact: true }).click();
  await expect(
    page.getByText("Credencial configurada", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  await page
    .getByLabel("Modelo de texto", { exact: true })
    .selectOption("models/gemini-2.5-flash");
  await page.getByRole("button", { name: "Salvar configuração local" }).click();
  await expect(page.getByText("Nenhuma alteração pendente")).toBeVisible();
  expect(state.counts().generations).toBe(0);
  expect(state.settings.configuration.models.imageGeneration).toBeNull();
  await page.getByRole("button", { name: "Testar modelo" }).first().dblclick();
  await expect(page.getByText("Conexão de teste funcionando.")).toBeVisible();
  expect(state.counts().generations).toBe(1);
  await page.getByRole("button", { name: "Substituir", exact: true }).click();
  await page.getByLabel("Token da API Gemini", { exact: true }).fill(secret);
  await page
    .locator(".ai-token-form")
    .getByRole("button", { name: "Cancelar", exact: true })
    .click();
  await expect(page.locator("input[type=password]")).toHaveCount(0);
  const storage = await page.evaluate(() =>
    JSON.stringify([localStorage, sessionStorage]),
  );
  expect(storage).not.toContain(secret);
  expect(errors.join("")).not.toContain(secret);
  expect(errors).toEqual([]);
  await page.locator(".language select").selectOption("en");
  await expect(page).toHaveURL(/\/platform\/ai-settings$/);
  await expect(
    page.getByRole("heading", { name: "AI settings", exact: true }),
  ).toBeVisible();
  await page.locator(".language select").selectOption("es");
  await expect(page).toHaveURL(/\/plataforma\/configuracion-ia$/);
  await expect(
    page.getByRole("heading", { name: "Configuración de IA", exact: true }),
  ).toBeVisible();
  await page.locator(".language select").selectOption("pt-BR");
  await expect(page).toHaveURL(/\/plataforma\/configuracoes-ia$/);
});
test("reference composition at desktop and mobile, keyboard and managed availability", async ({
  page,
}, testInfo) => {
  const state = await fixture(page);
  state.settings.connections.temporary = {
    status: "connected",
    revision: state.catalog.connectionRevision,
    expiresAt: new Date(Date.now() + 48 * 60000).toISOString(),
    errorCode: null,
  };
  state.settings.configuration.source = "temporary";
  state.settings.configuration.connectionRevision =
    state.catalog.connectionRevision;
  await page.setViewportSize({ width: 1616, height: 973 });
  await login(page);
  await page.goto("/plataforma/configuracoes-ia");
  await expect(
    page.getByText("Credencial configurada", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: `docs/evidence/ai/desktop-connected-${testInfo.project.name}.png`,
    fullPage: true,
  });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 973 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(
      page.getByRole("heading", { name: "Configurações de IA", exact: true }),
    ).toBeVisible();
    await page.screenshot({
      path: `docs/evidence/ai/${width}-${testInfo.project.name}.png`,
      fullPage: true,
    });
  }
  await page.getByLabel("Modelo de texto", { exact: true }).focus();
  await page.keyboard.press("Tab");
  await expect(
    page.getByLabel("Modelo de imagem", { exact: true }),
  ).toBeFocused();
  await page.getByRole("radio", { name: /Conexão gerenciada/ }).check();
  await expect(
    page.getByText(
      "Aguardando a configuração da conexão Gemini pela plataforma.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Salvar configuração local" }),
  ).toBeDisabled();
  expect(state.counts().generations).toBe(0);
});
test("both connection sources have informational usage and allow models without strict budgets", async ({
  page,
}) => {
  const state = await fixture(page);
  state.settings.configuration.source = "temporary";
  state.settings.configuration.exists = true;
  state.settings.connections.managed = {
    status: "connected",
    revision: state.catalog.connectionRevision,
    expiresAt: null,
    errorCode: null,
  };
  state.settings.connections.temporary = {
    ...state.settings.connections.managed,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
  };
  state.catalog.models[0] = {
    ...state.catalog.models[0]!,
    id: "models/gemini-3.5-flash-lite",
    label: "Gemini 3.5 Flash Lite",
    strictBudgetSupported: false,
  };
  await login(page);
  await page
    .getByRole("link", { name: "Configurações de IA", exact: true })
    .click();
  await expect(
    page.getByRole("switch", { name: "Pausar ao atingir o limite" }),
  ).toHaveCount(0);
  await page.getByRole("radio", { name: /Conexão gerenciada/ }).check();
  await expect(
    page.getByText("Sem limites locais", { exact: true }),
  ).toBeVisible();
  await expect(page.locator(".ai-usage-total strong")).toHaveText("65.000");
  await expect(
    page.getByRole("switch", { name: "Pausar ao atingir o limite" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Consumo de tokens" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Modelo de texto", { exact: true })
    .selectOption("models/gemini-3.5-flash-lite");
  await expect(page.getByText(/Este modelo não oferece um teto/)).toHaveCount(
    0,
  );
  await page
    .getByRole("button", { name: "Testar modelo", exact: true })
    .first()
    .click();
  await expect(page.getByText("Conexão de teste funcionando.")).toBeVisible();
  expect(state.counts().generations).toBe(1);
  await page.getByRole("radio", { name: /Token temporário/ }).check();
  await expect(
    page.getByRole("switch", { name: "Pausar ao atingir o limite" }),
  ).toHaveCount(0);
  await expect(page.locator(".ai-usage-total strong")).toHaveText("12.480");
  await expect(
    page.getByRole("progressbar", { name: "Consumo de tokens" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Modelo de texto", { exact: true })
    .selectOption("models/gemini-3.5-flash-lite");
  await expect(
    page.getByRole("button", { name: "Testar modelo", exact: true }).first(),
  ).toBeEnabled();
  await page
    .getByRole("button", { name: "Testar modelo", exact: true })
    .first()
    .click();
  await expect(page.getByText("Conexão de teste funcionando.")).toBeVisible();
  expect(state.counts().generations).toBe(2);
});
test("AI route is hidden and rejected for a regular user", async ({ page }) => {
  await login(page, "user@marketanalysis.com");
  await expect(
    page.getByRole("link", { name: "Configurações de IA", exact: true }),
  ).toHaveCount(0);
  await page.goto("/plataforma/configuracoes-ia");
  await expect(page).not.toHaveURL(/configuracoes-ia$/);
});

test("conflicting drafts and usage accounting stay explicit", async ({
  page,
}) => {
  const state = await fixture(page);
  state.settings.connections.temporary = {
    status: "connected",
    revision: state.catalog.connectionRevision,
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    errorCode: null,
  };
  state.settings.configuration.source = "temporary";
  state.settings.configuration.connectionRevision =
    state.catalog.connectionRevision;
  Object.assign(state.usage, {
    confirmed: 40000,
    input: 30000,
    output: 9000,
    thinking: 1000,
    reserved: 2000,
    estimated: 1000,
    unknownOperations: 1,
  });
  await login(page);
  await page.goto("/plataforma/configuracoes-ia");
  await expect(page.locator(".ai-usage-total strong")).toHaveText("40.000");
  await expect(
    page.getByText(/Raciocínio incluído no total: 1.000/),
  ).toBeVisible();
  await expect(
    page.getByText(/Estimativa em andamento: 2.000. Sem confirmação: 1.000/),
  ).toBeVisible();
  await expect(page.getByText(/atingiram pelo menos 80%/)).toHaveCount(0);
  await page
    .getByLabel("Modelo de texto", { exact: true })
    .selectOption("models/gemini-2.5-flash");
  state.settings.configuration.version = 1;
  state.settings.configuration.exists = true;
  await page.getByRole("button", { name: "Salvar configuração local" }).click();
  await expect(
    page.getByRole("button", { name: "Recarregar configuração" }),
  ).toBeVisible();
  await expect(page.getByLabel("Modelo de texto", { exact: true })).toHaveValue(
    "models/gemini-2.5-flash",
  );
  await page.getByRole("button", { name: "Recarregar configuração" }).click();
  await expect(page.getByLabel("Modelo de texto", { exact: true })).toHaveValue(
    "",
  );
  await expect(
    page.getByRole("switch", { name: "Pausar ao atingir o limite" }),
  ).toHaveCount(0);
  await page
    .getByLabel("Modelo de texto", { exact: true })
    .selectOption("models/gemini-2.5-flash");
  await page.getByRole("button", { name: "Salvar configuração local" }).click();
  await expect(page.getByText("Nenhuma alteração pendente")).toBeVisible();
  expect(state.counts().generations).toBe(0);
});
