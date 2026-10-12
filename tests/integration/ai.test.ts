import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import pg from "pg";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import type { Request, Response } from "express";
import { loadConfig } from "../../apps/api/src/common/config.js";
import { DatabaseService } from "../../apps/api/src/database/database.service.js";
import { AuditService } from "../../apps/api/src/audit/audit.service.js";
import {
  AiRepository,
  type AiContext,
} from "../../apps/api/src/ai/ai.repository.js";
import { AiService } from "../../apps/api/src/ai/ai.service.js";
import { AiCatalogService } from "../../apps/api/src/ai/ai-catalog.js";
import { ManagedConnection } from "../../apps/api/src/ai/managed-connection.js";
import type {
  AiCredential,
  AiGenerationEvent,
  AiGenerationInput,
  AiProvider,
} from "../../apps/api/src/ai/ai.provider.js";
import { AppError } from "../../apps/api/src/common/errors.js";
import { ChatService } from "../../apps/api/src/chat/chat.service.js";
import type { AuthService } from "../../apps/api/src/auth/auth.service.js";
import type { AiModel } from "@market/contracts";
import { Browser, root } from "./helpers";
const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const config = loadConfig({
  ...process.env,
  APP_ENV: "local",
  AI_GEMINI_ENABLED: "true",
  AI_LOCAL_TOKEN_ENABLED: "true",
  AI_GEMINI_SECRET_ID: "",
  AI_LOCAL_TOKEN_LIMIT: "1000",
  AI_OUTPUT_TOKEN_LIMIT: "256",
  CHAT_PROVIDER: "demo",
});
const db = new DatabaseService(config),
  repository = new AiRepository(db),
  audit = new AuditService();
const models: AiModel[] = [
  {
    id: "models/gemini-2.5-flash",
    label: "Text A",
    features: ["chatText"],
    inputTokenLimit: 10000,
    outputTokenLimit: 256,
    strictBudgetSupported: true,
  },
  {
    id: "models/gemini-3.5-flash-lite",
    label: "Text B",
    features: ["chatText"],
    inputTokenLimit: 10000,
    outputTokenLimit: 256,
    strictBudgetSupported: true,
  },
  {
    id: "models/gemini-3.1-flash-image",
    label: "Image",
    features: ["imageGeneration"],
    inputTokenLimit: 10000,
    outputTokenLimit: 256,
    strictBudgetSupported: false,
  },
];
class ControlledProvider implements AiProvider {
  generations: AiGenerationInput[] = [];
  rejectKey = "";
  count = 10;
  delay = 0;
  failure: "before" | "after" | undefined;
  unknown = false;
  reply = "Gemini";
  usage = { input: 10, output: 2, thinking: 3, total: 15 };
  async models(credential: AiCredential) {
    if (credential.key === this.rejectKey)
      throw new AppError(422, "AI_CREDENTIAL_REJECTED");
    return models;
  }
  async countTokens() {
    if (this.failure === "before")
      throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
    return this.count;
  }
  async *generate(
    _credential: AiCredential,
    input: AiGenerationInput,
    signal: AbortSignal,
  ): AsyncIterable<AiGenerationEvent> {
    this.generations.push(input);
    yield { type: "text", text: "Olá " };
    if (this.delay)
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, this.delay);
        signal.addEventListener(
          "abort",
          () => {
            clearTimeout(timer);
            reject(new Error("aborted"));
          },
          { once: true },
        );
      });
    signal.throwIfAborted();
    if (this.failure === "after")
      throw new AppError(502, "AI_PROVIDER_UNAVAILABLE");
    yield { type: "text", text: this.reply };
    if (input.feature === "imageGeneration")
      yield {
        type: "image",
        mimeType: "image/png",
        bytes: new Uint8Array([137, 80, 78, 71]),
      };
    if (!this.unknown)
      yield {
        type: "usage",
        usage: this.usage,
      };
  }
}
let ai: AiService,
  provider: ControlledProvider,
  managed: ManagedConnection,
  context: AiContext,
  otherSession: AiContext,
  second: AiContext;
const actors: string[] = [],
  agency = randomUUID(),
  tenant = randomUUID();
const services: AiService[] = [];
function service(settings = config) {
  const instance = new AiService(
    settings,
    repository,
    audit,
    managed,
    new AiCatalogService(provider),
    provider,
  );
  services.push(instance);
  return instance;
}
async function connect(c = context) {
  return ai.connect(c, randomUUID());
}
async function save(
  c = context,
  selection: { chatText: string | null; imageGeneration: string | null } = {
    chatText: models[0]!.id,
    imageGeneration: null,
  },
  pause = true,
) {
  const state = await ai.settings(c),
    catalog = await ai.models(c, "temporary");
  return ai.save(c, {
    scope: "local",
    expectedVersion: state.configuration.version,
    source: "temporary",
    connectionRevision: catalog.connectionRevision,
    models: selection,
    localPolicy: { warnAt80: true, pauseAtLimit: pause },
  });
}
async function start(
  feature: "chatText" | "imageGeneration" = "chatText",
  c = context,
  id = randomUUID(),
) {
  const catalog = await ai.models(c, "temporary");
  return ai.startTest(c, {
    operationId: id,
    feature,
    source: "temporary",
    modelId: feature === "chatText" ? models[0]!.id : models[2]!.id,
    connectionRevision: catalog.connectionRevision,
  });
}
async function done(id: string, c = context) {
  for (let i = 0; i < 100; i++) {
    const op = await ai.readTest(c, id);
    if (!["queued", "running"].includes(op.status)) return op;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("operation did not finish");
}
async function waitSent(count = 1) {
  for (let i = 0; i < 100; i++) {
    if (provider.generations.length >= count) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error("not sent");
}
beforeAll(async () => {
  await owner.query(
    'INSERT INTO "Agency" (id,name,slug,"updatedAt") VALUES ($1::uuid,\'AI fixture\',$1::text,now())',
    [agency],
  );
  await owner.query(
    'INSERT INTO "Tenant" (id,"agencyId",name,slug,status,"updatedAt") VALUES ($1::uuid,$2,\'AI fixture\',$1::text,\'active\',now())',
    [tenant, agency],
  );
});
beforeEach(async () => {
  provider = new ControlledProvider();
  managed = new ManagedConnection(config, {
    send: vi.fn().mockRejectedValue(new Error("unexpected AWS")),
    destroy: vi.fn(),
  } as never);
  ai = service();
  const user = randomUUID(),
    other = randomUUID();
  actors.push(user, other);
  for (const id of [user, other])
    await owner.query(
      'INSERT INTO "User" (id,email,name,"passwordHash","platformRole","updatedAt") VALUES ($1,$2,\'AI fixture\',\'unusable\',\'GLOBAL\',now())',
      [id, `${id}@ai.example.test`],
    );
  async function ctx(userId: string): Promise<AiContext> {
    const id = randomUUID();
    await owner.query(
      'INSERT INTO "Session" (id,"userId","tokenHash","expiresAt") VALUES ($1,$2,$3,now()+interval \'2 hours\')',
      [id, userId, randomUUID()],
    );
    return {
      actor: { id: userId, platformRole: "GLOBAL" },
      sessionId: id,
      requestId: randomUUID(),
    };
  }
  context = await ctx(user);
  otherSession = await ctx(user);
  second = await ctx(other);
  // These integration tests must never call Google or AWS.
  vi.spyOn(globalThis, "fetch").mockRejectedValue(
    new Error("Network disabled in AI integration"),
  );
});
afterEach(async () => {
  services.splice(0).forEach((s) => s.onModuleDestroy());
  managed.onModuleDestroy();
  vi.restoreAllMocks();
});
afterAll(async () => {
  await db.onModuleDestroy();
  await owner.query(
    'DELETE FROM "AiConfiguration" WHERE "updatedBy" = ANY($1::uuid[])',
    [actors],
  );
  await owner.query(
    'DELETE FROM "AiOperation" WHERE "actorId" = ANY($1::uuid[])',
    [actors],
  );
  await owner.query('DELETE FROM "Message" WHERE "tenantId"=$1', [tenant]);
  await owner.query('DELETE FROM "ChatOperation" WHERE "tenantId"=$1', [
    tenant,
  ]);
  await owner.query('DELETE FROM "Conversation" WHERE "tenantId"=$1', [tenant]);
  await owner.query('DELETE FROM "Session" WHERE "userId" = ANY($1::uuid[])', [
    actors,
  ]);
  await owner.query('DELETE FROM "TenantMembership" WHERE "tenantId"=$1', [
    tenant,
  ]);
  await owner.query('DELETE FROM "Tenant" WHERE id=$1', [tenant]);
  await owner.query('DELETE FROM "Agency" WHERE id=$1', [agency]);
  await owner.query('DELETE FROM "User" WHERE id = ANY($1::uuid[])', [actors]);
  await owner.end();
});
describe("AI persistence, runtime RLS and controlled generation", () => {
  it.each(["local", "production"] as const)(
    "does not apply temporary-token quotas to managed generation in %s",
    async (environment) => {
      const settings = {
        ...config,
        APP_ENV: environment,
        NODE_ENV:
          environment === "production"
            ? ("production" as const)
            : ("development" as const),
        AI_GEMINI_SECRET_ID: "fixture-gemini",
        AI_GEMINI_SECRET_REGION: "us-east-1",
      };
      managed.onModuleDestroy();
      managed = new ManagedConnection(settings, {
        send: vi.fn().mockResolvedValue({
          SecretString: JSON.stringify({ apiKey: randomUUID() }),
          VersionId: randomUUID(),
        }),
        destroy: vi.fn(),
      } as never);
      ai = service(settings);
      vi.spyOn(provider, "models").mockResolvedValue(
        models.map((model) =>
          model.id === models[1]!.id
            ? { ...model, outputTokenLimit: 8192, strictBudgetSupported: false }
            : model,
        ),
      );
      const catalog = await ai.models(context, "managed");
      provider.count = 1500;
      provider.usage = { input: 1500, output: 2, thinking: 3, total: 1505 };
      provider.delay = 150;
      const operations = await Promise.all(
        Array.from({ length: 3 }, () =>
          ai.startTest(context, {
            operationId: randomUUID(),
            source: "managed",
            feature: "imageGeneration",
            modelId: models[2]!.id,
            connectionRevision: catalog.connectionRevision,
          }),
        ),
      );
      const results = await Promise.all(operations.map((op) => done(op.id)));
      expect(results.map((op) => op.status)).toEqual([
        "completed",
        "completed",
        "completed",
      ]);
      expect(await ai.usage(context, "managed")).toMatchObject({
        scope: "managed",
        tokenLimit: null,
        imageLimit: null,
        confirmed: 4515,
        imageOperations: 3,
      });
      if (environment === "local") {
        const current = await ai.settings(context);
        await ai.save(context, {
          scope: "local",
          expectedVersion: current.configuration.version,
          source: "managed",
          connectionRevision: catalog.connectionRevision,
          models: { chatText: models[1]!.id, imageGeneration: models[2]!.id },
          localPolicy: { warnAt80: true, pauseAtLimit: true },
        });
        provider.delay = 0;
        const conversationId = randomUUID();
        await owner.query(
          'INSERT INTO "Conversation" (id,"tenantId","ownerId",title,"updatedAt") VALUES ($1,$2,$3,\'Managed AI fixture\',now())',
          [conversationId, tenant, context.actor.id],
        );
        let reply = "";
        for await (const chunk of ai.chat(
          { ...context, tenantId: tenant, conversationId },
          randomUUID(),
          [{ role: "user", parts: [{ text: "Managed chat fixture" }] }],
          new AbortController().signal,
        ))
          reply += chunk;
        expect(reply).toBe("Olá Gemini");
        expect(provider.generations.at(-1)?.maxOutputTokens).toBe(8192);
        expect((await ai.usage(context)).confirmed).toBe(6020);
        expect(await ai.usage(context, "temporary")).toMatchObject({
          confirmed: 0,
          imageOperations: 0,
          tokenLimit: null,
          imageLimit: null,
        });
        await connect();
        await save();
        provider.count = 10;
        provider.usage = { input: 10, output: 2, thinking: 3, total: 15 };
        const temporaryTest = await start();
        expect((await done(temporaryTest.id)).status).toBe("completed");
        expect((await ai.usage(context)).confirmed).toBe(15);
        expect((await ai.usage(context, "managed")).confirmed).toBe(6020);
      }
    },
  );
  it("boots without any key, forbids local credentials in production and enforces current Global/session", async () => {
    expect((await ai.settings(context)).connections.managed.status).toBe(
      "not_configured",
    );
    await expect(
      service({ ...config, NODE_ENV: "production" }).connect(
        context,
        randomUUID(),
      ),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      ai.connect({ ...context, sessionId: second.sessionId }, randomUUID()),
    ).rejects.toThrow("UNAUTHENTICATED");
    await owner.query('UPDATE "User" SET "platformRole"=NULL WHERE id=$1', [
      second.actor.id,
    ]);
    await expect(ai.settings(second)).rejects.toThrow("FORBIDDEN");
  });
  it("isolates sessions, preserves the old connection on rejection and saves text without images", async () => {
    const key = randomUUID(),
      connection = await ai.connect(context, key);
    provider.rejectKey = randomUUID();
    await expect(ai.connect(context, provider.rejectKey)).rejects.toThrow(
      "AI_CREDENTIAL_REJECTED",
    );
    expect((await ai.models(context, "temporary")).connectionRevision).toBe(
      connection.revision,
    );
    await expect(ai.models(otherSession, "temporary")).rejects.toThrow(
      "AI_CONNECTION_EXPIRED",
    );
    const state = await save();
    expect(state.configuration.models.imageGeneration).toBeNull();
    expect((await ai.settings(otherSession)).configuration.exists).toBe(false);
    expect(provider.generations).toHaveLength(0);
    const rows = await owner.query(
      'SELECT row_to_json(c) value FROM "AiConfiguration" c WHERE "ownerId"=$1',
      [context.actor.id],
    );
    const logs = await owner.query(
      'SELECT row_to_json(a) value FROM "AuditLog" a WHERE "actorId"=$1',
      [context.actor.id],
    );
    expect(JSON.stringify([state, rows.rows, logs.rows])).not.toContain(key);
  });
  it("commits only one optimistic write and rejects forged models or scope", async () => {
    const connection = await connect();
    const input = {
      scope: "local" as const,
      expectedVersion: 0,
      source: "temporary" as const,
      connectionRevision: connection.revision,
      models: { chatText: models[0]!.id, imageGeneration: null },
    };
    const results = await Promise.allSettled([
      ai.save(context, input),
      ai.save(context, input),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
    await expect(
      ai.save(context, { ...input, scope: "managed" }),
    ).rejects.toThrow("FORBIDDEN");
    await expect(
      ai.save(context, {
        ...input,
        expectedVersion: 1,
        models: { chatText: models[2]!.id, imageGeneration: null },
      }),
    ).rejects.toThrow("AI_MODEL_INCOMPATIBLE");
  });
  it("does not expose local preferences under another runtime session and retains expired selection after restart", async () => {
    await connect();
    await save();
    const hidden = await repository.run(otherSession, (tx) =>
      tx.aiConfiguration.findMany({ where: { ownerId: context.actor.id } }),
    );
    expect(hidden).toHaveLength(0);
    const restart = service();
    const settings = await restart.settings(context);
    expect(settings.configuration.source).toBe("temporary");
    expect(settings.connections.temporary.status).toBe("expired");
    expect(await restart.mode(context)).toBe("unavailable");
    expect(provider.generations).toHaveLength(0);
  });
  it("deduplicates simultaneous tests, records cumulative use once and replays after revocation", async () => {
    await connect();
    const revision = (await ai.models(context, "temporary")).connectionRevision,
      id = randomUUID();
    const input = {
      operationId: id,
      feature: "chatText" as const,
      source: "temporary" as const,
      modelId: models[0]!.id,
      connectionRevision: revision,
    };
    await Promise.all([
      ai.startTest(context, input),
      ai.startTest(context, input),
    ]);
    const result = await done(id);
    expect(result.status).toBe("completed");
    expect(result.text).toBe("Olá Gemini");
    expect(result.usage.total).toBe(15);
    expect(provider.generations).toHaveLength(1);
    await ai.revoke(context);
    expect((await ai.startTest(context, input)).status).toBe("completed");
    expect(provider.generations).toHaveLength(1);
    expect((await ai.usage(context, "temporary")).confirmed).toBe(15);
    await expect(ai.readTest(otherSession, id)).rejects.toThrow("NOT_FOUND");
  });
  it("allows consumption above old quotas across sessions and retains usage after replacing keys", async () => {
    await connect();
    await connect(otherSession);
    provider.count = 500;
    provider.usage = { input: 60000, output: 2, thinking: 3, total: 60005 };
    provider.delay = 150;
    const [a, b] = await Promise.all([
      start(),
      start("chatText", otherSession),
    ]);
    const results = await Promise.all([done(a.id), done(b.id, otherSession)]);
    expect(results.map((r) => r.status)).toEqual(["completed", "completed"]);
    expect(provider.generations).toHaveLength(2);
    await connect();
    expect((await ai.usage(context, "temporary")).confirmed).toBe(120010);
    expect((await done((await start()).id)).status).toBe("completed");
  });
  it("keeps ambiguous reservations, releases pre-send failures and tracks unknown usage separately", async () => {
    await connect();
    provider.failure = "before";
    const before = await start();
    await done(before.id);
    expect((await ai.usage(context, "temporary")).estimated).toBe(0);
    provider.failure = "after";
    const after = await start();
    await done(after.id);
    expect((await ai.usage(context, "temporary")).estimated).toBe(266);
    provider.failure = undefined;
    provider.unknown = true;
    const unknown = await start();
    await done(unknown.id);
    const usage = await ai.usage(context, "temporary");
    expect(usage.confirmed).toBe(0);
    expect(usage.unknownOperations).toBe(2);
    expect(usage.estimated).toBe(532);
  });
  it("cancels in-flight generation on revoke and keeps already sent reservation", async () => {
    await connect();
    provider.delay = 5000;
    const test = await start();
    await waitSent();
    await ai.revoke(context);
    const result = await done(test.id);
    expect(result.status).toBe("cancelled");
    expect(result.errorCode).toBe("AI_CONNECTION_EXPIRED");
    expect((await ai.usage(context, "temporary")).estimated).toBe(266);
  });
  it("ignores legacy pause settings for models without strict budgets and keeps previews private", async () => {
    await connect();

    await save(
      context,
      { chatText: models[0]!.id, imageGeneration: models[2]!.id },
      true,
    );
    expect((await ai.settings(context)).configuration.localPolicy).toEqual({
      warnAt80: false,
      pauseAtLimit: false,
    });
    const test = await start("imageGeneration");
    expect((await done(test.id)).previewAvailable).toBe(true);
    expect((await ai.image(context, test.id)).length).toBe(4);
    await expect(ai.image(otherSession, test.id)).rejects.toThrow("NOT_FOUND");
    await expect(service().image(context, test.id)).rejects.toThrow(
      "AI_PREVIEW_EXPIRED",
    );
    await ai.revoke(context);
    await expect(ai.image(context, test.id)).rejects.toThrow(
      "AI_PREVIEW_EXPIRED",
    );
    expect(provider.generations).toHaveLength(1);
  });
  it("revalidates Global access and never falls back after role loss", async () => {
    await connect();
    await save();
    await owner.query(
      'INSERT INTO "TenantMembership" (id,"tenantId","userId",role,"updatedAt") VALUES ($1,$2,$3,\'USER\',now())',
      [randomUUID(), tenant, context.actor.id],
    );
    await owner.query('UPDATE "User" SET "platformRole"=NULL WHERE id=$1', [
      context.actor.id,
    ]);
    expect(await ai.mode({ ...context, tenantId: tenant })).toBe("unavailable");
    await expect(ai.models(context, "temporary")).rejects.toThrow("FORBIDDEN");
  });
  it("serves Chat progressively with authorized history, future model changes, private replay and no demo fallback", async () => {
    await connect();
    await save();
    const chat = new ChatService(
      config,
      db,
      {
        resolve: async () => ({ user: context.actor }),
      } as unknown as AuthService,
      audit,
      ai,
    );
    const conversation = await chat.create(
      context.actor,
      tenant,
      "Gemini",
      context.requestId,
    );
    const req = {
      actor: context.actor,
      sessionId: context.sessionId,
      requestId: context.requestId,
    } as Request;
    function response() {
      const res = Object.assign(new EventEmitter(), {
        destroyed: false,
        status: vi.fn(),
        set: vi.fn(),
        flushHeaders: vi.fn(),
        write: vi.fn(),
        end: vi.fn(),
      });
      return res;
    }
    const input = {
      operationId: randomUUID(),
      content: "First private question",
      locale: "pt-BR" as const,
    };
    const res = response();
    await chat.stream(
      req,
      res as unknown as Response,
      tenant,
      conversation.id,
      input,
    );
    expect(res.write.mock.calls.map((c) => c[0]).join("")).toContain(
      '"provider":"gemini"',
    );
    expect(provider.generations[0]?.contents).toEqual([
      { role: "user", parts: [{ text: input.content }] },
    ]);
    await save(context, { chatText: models[1]!.id, imageGeneration: null });
    await chat.stream(
      req,
      response() as unknown as Response,
      tenant,
      conversation.id,
      { ...input, operationId: randomUUID(), content: "Follow up" },
    );
    expect(provider.generations[1]?.model.id).toBe(models[1]!.id);
    expect(provider.generations[1]?.contents).toHaveLength(3);
    await expect(
      chat.stream(
        { ...req, actor: second.actor, sessionId: second.sessionId } as Request,
        response() as unknown as Response,
        tenant,
        conversation.id,
        input,
      ),
    ).rejects.toThrow("NOT_FOUND");
    await ai.revoke(context);
    const replay = response();
    await chat.stream(
      req,
      replay as unknown as Response,
      tenant,
      conversation.id,
      input,
    );
    expect(replay.write.mock.calls.map((c) => c[0]).join("")).toContain(
      '"existing":true',
    );
    expect(provider.generations).toHaveLength(2);
    await expect(
      chat.stream(
        req,
        response() as unknown as Response,
        tenant,
        conversation.id,
        { ...input, operationId: randomUUID() },
      ),
    ).rejects.toThrow("AI_NOT_CONFIGURED");
    chat.onModuleDestroy();
  });

  it("preserves large Chat input, output and more than one thousand history messages", async () => {
    await connect();
    await save();
    const chat = new ChatService(
      config,
      db,
      {
        resolve: async () => ({ user: context.actor }),
      } as unknown as AuthService,
      audit,
      ai,
    );
    const conversation = await chat.create(
      context.actor,
      tenant,
      "Large Gemini fixture",
      context.requestId,
    );
    await owner.query(
      `INSERT INTO "Message" (id,"tenantId","conversationId",role,content,status,"operationId",position) SELECT gen_random_uuid(),$1,$2,'user','Authorized fixture history','completed',gen_random_uuid(),n FROM generate_series(1,1001) n`,
      [tenant, conversation.id],
    );
    const res = Object.assign(new EventEmitter(), {
      destroyed: false,
      status: vi.fn(),
      set: vi.fn(),
      flushHeaders: vi.fn(),
      write: vi.fn(),
      end: vi.fn(),
    });
    const content = "Large input " + "x".repeat(270000);
    provider.reply = "y".repeat(40000);
    const operationId = randomUUID();
    await chat.stream(
      {
        actor: context.actor,
        sessionId: context.sessionId,
        requestId: context.requestId,
      } as Request,
      res as unknown as Response,
      tenant,
      conversation.id,
      { content, operationId, locale: "pt-BR" },
    );
    expect(provider.generations[0]?.contents).toHaveLength(1002);
    expect(provider.generations[0]?.contents.at(-1)?.parts[0]?.text).toBe(
      content,
    );
    const saved = await chat.read(
      context.actor,
      tenant,
      conversation.id,
      context.requestId,
    );
    expect(saved.messages.at(-1)?.content).toBe("Olá " + provider.reply);
    expect(saved.operations[0]?.status).toBe("completed");
    chat.onModuleDestroy();
  });
  it("allows concurrent temporary generations and more than ten images in a window", async () => {
    await connect();
    await save(
      context,
      { chatText: models[0]!.id, imageGeneration: models[2]!.id },
      true,
    );
    provider.delay = 150;
    const operations = await Promise.all([start(), start(), start()]);
    const results = await Promise.all(operations.map((op) => done(op.id)));
    expect(results.map((op) => op.status)).toEqual([
      "completed",
      "completed",
      "completed",
    ]);
    provider.delay = 0;
    for (let i = 0; i < 12; i++)
      expect((await done((await start("imageGeneration")).id)).status).toBe(
        "completed",
      );
    expect(await ai.usage(context, "temporary")).toMatchObject({
      imageOperations: 12,
      tokenLimit: null,
      imageLimit: null,
    });
  });
  it("expires private previews and rejects malformed IDs without regenerating", async () => {
    await connect();
    await save(
      context,
      { chatText: models[0]!.id, imageGeneration: models[2]!.id },
      false,
    );
    const test = await start("imageGeneration");
    await done(test.id);
    const now = Date.now();
    const clock = vi.spyOn(Date, "now").mockReturnValue(now + 300001);
    await expect(ai.image(context, test.id)).rejects.toThrow(
      "AI_PREVIEW_EXPIRED",
    );
    clock.mockRestore();
    expect(provider.generations).toHaveLength(1);
    await expect(ai.image(context, randomUUID())).rejects.toThrow("NOT_FOUND");
  });
  it("stops generation after session revocation and retains usage for another session", async () => {
    await connect();
    provider.delay = 10000;
    ai.onModuleInit();
    const test = await start();
    await waitSent();
    await owner.query('UPDATE "Session" SET "revokedAt"=now() WHERE id=$1', [
      context.sessionId,
    ]);
    await expect(ai.models(context, "temporary")).rejects.toThrow(
      "UNAUTHENTICATED",
    );
    for (let i = 0; i < 60; i++) {
      const row = (
        await owner.query('SELECT status FROM "AiOperation" WHERE id=$1', [
          test.id,
        ])
      ).rows[0];
      if (row.status === "cancelled") break;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    expect(
      (
        await owner.query('SELECT status FROM "AiOperation" WHERE id=$1', [
          test.id,
        ])
      ).rows[0].status,
    ).toBe("cancelled");
    expect((await ai.usage(otherSession, "temporary")).estimated).toBe(266);
  });
  it("reconciles stale sent operations conservatively without another generation", async () => {
    await connect();
    const test = await start();
    await done(test.id);
    await owner.query(
      'UPDATE "AiOperation" SET status=\'running\',"totalTokens"=NULL,"updatedAt"=now()-interval \'1 minute\' WHERE id=$1',
      [test.id],
    );
    ai.onModuleInit();
    await new Promise((resolve) => setTimeout(resolve, 2200));
    expect((await ai.readTest(context, test.id)).status).toBe("interrupted");
    expect((await ai.usage(context, "temporary")).estimated).toBe(266);
    expect(provider.generations).toHaveLength(1);
  });
});
describe("AI HTTP boundary without credentials", () => {
  it("requires session, Global, Origin and CSRF; provides safe no-store settings and rejects excess bodies", async () => {
    vi.restoreAllMocks();
    const b = new Browser();
    expect((await b.call("/ai/settings")).status).toBe(401);
    await b.login("user@marketanalysis.com");
    expect((await b.call("/ai/settings")).status).toBe(403);
    await owner.query(
      'UPDATE "User" SET "passwordHash"=(SELECT "passwordHash" FROM "User" WHERE email=$1) WHERE id=$2',
      ["global@marketanalysis.com", context.actor.id],
    );
    const g = new Browser();
    await g.login(context.actor.id + "@ai.example.test");
    const settings = await g.raw("/ai/settings");
    expect(settings.status).toBe(200);
    expect(settings.headers.get("cache-control")).toContain("no-store");
    expect(await settings.json()).not.toHaveProperty("token");
    await g.call("/auth/csrf");
    for (const origin of [
      "http://hostile.example.test",
      "http://localhost:8080",
    ]) {
      const response = await fetch(root + "/ai/local-connection", {
        method: "POST",
        headers: {
          Origin: origin,
          Cookie: [...g.cookies].map(([k, v]) => k + "=" + v).join("; "),
          "Content-Type": "application/json",
          ...(origin.includes("hostile") ? { "X-CSRF-Token": g.csrf } : {}),
        },
        body: JSON.stringify({ provider: "gemini", token: randomUUID() }),
      });
      expect(response.status).toBe(403);
      expect((await response.json()).code).toBe("CSRF_INVALID");
    }
    expect(
      (
        await g.call("/ai/local-connection", "POST", {
          provider: "gemini",
          token: "x".repeat(513),
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await g.call("/ai/local-connection", "POST", {
          provider: "gemini",
          token: "x".repeat(100000),
        })
      ).status,
    ).toBe(400);
    const attempts = [];
    for (let i = 0; i < 7; i++)
      attempts.push(
        await g.call("/ai/local-connection", "POST", {
          provider: "gemini",
          token: "short",
        }),
      );
    expect(
      attempts.every(
        (r) => r.status === 400 && r.data.code === "VALIDATION_ERROR",
      ),
    ).toBe(true);
    for (let i = 0; i < 35; i++)
      expect((await g.call("/ai/settings")).status).toBe(200);
    for (let i = 0; i < 7; i++)
      expect((await g.call("/ai/model-tests", "POST", {})).status).toBe(400);
  });
});
