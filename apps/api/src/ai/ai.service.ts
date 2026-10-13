import {
  Inject,
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import {
  aiConfigurationSchema,
  aiErrorCodeSchema,
  type AiConfiguration,
  type AiConnection,
  type AiSettings,
  type AiSettingsInput,
  type AiSource,
  type AiModelTestInput,
  type AiFeature,
  type AiOperation as PublicOperation,
  type AiTokenUsage,
  type AiUsage,
} from "@market/contracts";
import type { AiOperation } from "../generated/prisma/client.js";
import { CONFIG, localAiAllowed, type Config } from "../common/config.js";
import { AppError } from "../common/errors.js";
import { AuditService } from "../audit/audit.service.js";
import { AiRepository, type AiContext } from "./ai.repository.js";
import { ManagedConnection } from "./managed-connection.js";
import { LocalConnections } from "./local-connections.js";
import { AiCatalogService } from "./ai-catalog.js";
import {
  AI_PROVIDER,
  type AiProvider,
  type AiCredential,
  type AiContent,
  type AiGenerationInput,
  type AiGenerationEvent,
} from "./ai.provider.js";

const emptyUsage = (): AiTokenUsage => ({
  input: null,
  output: null,
  thinking: null,
  total: null,
});
const hourStart = (time = Date.now()) =>
  new Date(Math.floor(time / 3600000) * 3600000);
const errorCode = (error: unknown) => {
  const code =
    error instanceof AppError
      ? (error.getResponse() as { code: string }).code
      : "";
  return aiErrorCodeSchema.safeParse(code).success
    ? aiErrorCodeSchema.parse(code)
    : ("AI_PROVIDER_UNAVAILABLE" as const);
};
interface Snapshot {
  credential: AiCredential;
  input: AiGenerationInput;
  configuration: AiConfiguration;
  source: AiSource;
}
interface Result {
  sessionId: string;
  expiresAt: number;
  text: string;
  image?: Uint8Array;
  signal: AbortSignal;
}
@Injectable()
export class AiService implements OnModuleInit, OnModuleDestroy {
  private local = new LocalConnections();
  private results = new Map<string, Result>();
  private active = new Map<
    string,
    { control: AbortController; sessionId: string }
  >();
  private timer?: NodeJS.Timeout;
  private cleaning = false;
  constructor(
    @Inject(CONFIG) private config: Config,
    @Inject(AiRepository) private repository: AiRepository,
    @Inject(AuditService) private audit: AuditService,
    @Inject(ManagedConnection) private managed: ManagedConnection,
    @Inject(AiCatalogService) private catalog: AiCatalogService,
    @Inject(AI_PROVIDER) private provider: AiProvider,
  ) {}
  onModuleInit() {
    this.timer = setInterval(() => void this.cleanup().catch(() => {}), 2000);
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
    this.local.clear();
    this.results.clear();
    for (const op of this.active.values()) op.control.abort();
  }
  private get environment() {
    return this.config.NODE_ENV === "production"
      ? "production"
      : this.config.APP_ENV;
  }
  private get localEnvironment() {
    return this.environment === "local";
  }
  private assertEnabled() {
    if (this.config.AI_GEMINI_ENABLED !== "true")
      throw new AppError(503, "AI_NOT_CONFIGURED");
  }
  private assertLocal() {
    if (!localAiAllowed(this.config)) throw new AppError(403, "FORBIDDEN");
  }
  private async credential(context: AiContext, source: AiSource) {
    this.assertEnabled();
    if (source === "managed") return this.managed.resolve();
    this.assertLocal();
    await this.repository.assertGlobalSession(context);
    return this.local.get(context.sessionId, context.actor.id);
  }
  private async configuration(context: AiContext): Promise<AiConfiguration> {
    return this.repository.run(context, async (tx) => {
      const row =
        (this.localEnvironment
          ? await tx.aiConfiguration.findUnique({
              where: { key: `local:${context.sessionId}` },
            })
          : null) ??
        (await tx.aiConfiguration.findUnique({
          where: { key: `managed:${this.environment}` },
        }));
      return aiConfigurationSchema.parse({
        scope: this.localEnvironment ? "local" : "managed",
        exists: !!row,
        version:
          row?.scope === (this.localEnvironment ? "local" : "managed")
            ? row.version
            : 0,
        source: row?.source ?? "managed",
        connectionRevision: row?.connectionRevision ?? null,
        models: {
          chatText: row?.chatText ?? null,
          imageGeneration: row?.imageGeneration ?? null,
        },
        localPolicy: {
          warnAt80: false,
          pauseAtLimit: false,
        },
      });
    });
  }
  async settings(context: AiContext): Promise<AiSettings> {
    await this.repository.assertGlobalSession(context);
    const configuration = await this.configuration(context);
    const status = async (source: AiSource): Promise<AiConnection> => {
      if (
        (source === "temporary" && !localAiAllowed(this.config)) ||
        (source === "managed" && !this.managed.configured)
      )
        return {
          status: "not_configured",
          revision: null,
          expiresAt: null,
          errorCode: null,
        };
      try {
        const credential = await this.credential(context, source);
        await this.catalog.get(
          source,
          source === "managed" ? "managed" : context.sessionId,
          credential,
        );
        return {
          status: "connected",
          revision: credential.revision,
          expiresAt:
            source === "temporary"
              ? new Date(credential.expiresAt).toISOString()
              : null,
          errorCode: null,
        };
      } catch (error) {
        const code = errorCode(error),
          expired = code === "AI_CONNECTION_EXPIRED";
        return {
          status: expired
            ? configuration.source === "temporary"
              ? "expired"
              : "not_configured"
            : "unavailable",
          revision: null,
          expiresAt: null,
          errorCode:
            expired && configuration.source !== "temporary" ? null : code,
        };
      }
    };
    const [managed, temporary] = await Promise.all([
      status("managed"),
      status("temporary"),
    ]);
    return {
      environment: this.environment,
      enabled: this.config.AI_GEMINI_ENABLED === "true",
      localTokenAllowed: localAiAllowed(this.config),
      serverTime: new Date().toISOString(),
      configuration,
      connections: { managed, temporary },
    };
  }
  async models(context: AiContext, source: AiSource) {
    await this.repository.assertGlobalSession(context);
    const credential = await this.credential(context, source);
    return this.catalog.get(
      source,
      source === "managed" ? "managed" : context.sessionId,
      credential,
    );
  }
  async connect(context: AiContext, token: string) {
    this.assertLocal();
    await this.repository.assertGlobalSession(context);
    const probe = {
      key: token,
      revision: randomUUID(),
      expiresAt: Date.now() + 30000,
      signal: AbortSignal.timeout(30000),
    };
    await this.provider.models(probe, probe.signal);
    await this.repository.assertGlobalSession(context);
    await this.repository.run(
      context,
      (tx) =>
        this.audit.record(
          tx,
          context.actor,
          "ai.connection.connected",
          context.requestId,
        ),
      true,
    );
    this.revokeMemory(context.sessionId);
    const credential = this.local.activate(
      context.sessionId,
      context.actor.id,
      token,
    );
    return {
      status: "connected" as const,
      revision: credential.revision,
      expiresAt: new Date(credential.expiresAt).toISOString(),
      errorCode: null,
    };
  }
  private revokeMemory(sessionId: string) {
    this.local.revoke(sessionId);
    this.catalog.invalidate(sessionId);
    for (const [id, result] of this.results)
      if (result.sessionId === sessionId) this.results.delete(id);
    for (const op of this.active.values())
      if (op.sessionId === sessionId) op.control.abort();
  }
  async revoke(context: AiContext) {
    this.assertLocal();
    await this.repository.assertGlobalSession(context);
    this.revokeMemory(context.sessionId);
    await this.repository.run(
      context,
      (tx) =>
        this.audit.record(
          tx,
          context.actor,
          "ai.connection.revoked",
          context.requestId,
        ),
      true,
    );
    return { ok: true };
  }
  async save(context: AiContext, data: AiSettingsInput) {
    await this.repository.assertGlobalSession(context);
    this.assertEnabled();
    if (data.scope !== (this.localEnvironment ? "local" : "managed"))
      throw new AppError(403, "FORBIDDEN");
    const credential = await this.credential(context, data.source);
    if (credential.revision !== data.connectionRevision)
      throw new AppError(409, "CONFLICT");
    const catalog = await this.catalog.get(
      data.source,
      data.source === "managed" ? "managed" : context.sessionId,
      credential,
    );
    for (const feature of ["chatText", "imageGeneration"] as const) {
      const id = data.models[feature];
      if (
        id &&
        !catalog.models.some(
          (model) => model.id === id && model.features.includes(feature),
        )
      )
        throw new AppError(422, "AI_MODEL_INCOMPATIBLE");
    }
    await this.repository.run(
      context,
      async (tx) => {
        if (credential.signal.aborted || credential.expiresAt <= Date.now())
          throw new AppError(409, "AI_CONNECTION_EXPIRED");
        const key =
          data.scope === "local"
            ? `local:${context.sessionId}`
            : `managed:${this.environment}`;
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${key},44172))::text`;
        const previous = await tx.aiConfiguration.findUnique({
          where: { key },
        });
        if ((previous?.version ?? 0) !== data.expectedVersion)
          throw new AppError(409, "CONFLICT");
        const before = await this.audit.snapshot(tx, "ai.settings.saved", key);
        const values = {
          environment: this.environment,
          scope: data.scope,
          sessionId: data.scope === "local" ? context.sessionId : null,
          ownerId: data.scope === "local" ? context.actor.id : null,
          source: data.source,
          connectionRevision: credential.revision,
          chatText: data.models.chatText,
          imageGeneration: data.models.imageGeneration,
          warnAt80: false,
          pauseAtLimit: false,
          version: data.expectedVersion + 1,
          updatedBy: context.actor.id,
        };
        await tx.aiConfiguration.upsert({
          where: { key },
          create: { key, ...values },
          update: values,
        });
        await this.audit.record(
          tx,
          context.actor,
          "ai.settings.saved",
          context.requestId,
          { resourceId: key, before },
        );
      },
      true,
    );
    return this.settings(context);
  }
  async mode(context: AiContext) {
    const configuration = await this.configuration(context);
    if (!configuration.exists) return null;
    if (
      !configuration.models.chatText ||
      this.config.AI_GEMINI_ENABLED !== "true"
    )
      return "unavailable" as const;
    try {
      await this.credential(context, configuration.source);
      return "gemini" as const;
    } catch {
      return "unavailable" as const;
    }
  }
  private async snapshot(
    context: AiContext,
    feature: AiFeature,
    selection?: AiModelTestInput,
  ): Promise<Snapshot> {
    const configuration = await this.configuration(context);
    const source = selection?.source ?? configuration.source;
    const credential = await this.credential(context, source);
    if (
      source === "temporary" &&
      credential.revision !==
        (selection?.connectionRevision ?? configuration.connectionRevision)
    )
      throw new AppError(409, "AI_CONNECTION_EXPIRED");
    if (selection && selection.connectionRevision !== credential.revision)
      throw new AppError(409, "CONFLICT");
    const catalog = await this.catalog.get(
      source,
      source === "managed" ? "managed" : context.sessionId,
      credential,
    );
    const model = catalog.models.find(
      (m) =>
        m.id === (selection?.modelId ?? configuration.models[feature]) &&
        m.features.includes(feature),
    );
    if (!model) throw new AppError(422, "AI_MODEL_INCOMPATIBLE");
    return {
      credential,
      configuration,
      source,
      input: {
        model,
        feature,
        contents: [],
        maxOutputTokens: model.outputTokenLimit,
      },
    };
  }
  private async newOperation(
    context: AiContext,
    id: string,
    snapshot: Snapshot,
    kind: "test" | "chat",
  ) {
    return this.repository.run(context, async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},44173))::text`;
      const old = await tx.aiOperation.findUnique({ where: { id } });
      if (old) {
        if (
          old.actorId !== context.actor.id ||
          old.sessionId !== context.sessionId ||
          old.modelId !== snapshot.input.model.id ||
          old.feature !== snapshot.input.feature ||
          old.source !== snapshot.source ||
          old.kind !== kind
        )
          throw new AppError(409, "CONFLICT");
        return { operation: old, created: false };
      }
      const operation = await tx.aiOperation.create({
        data: {
          id,
          environment: this.environment,
          actorId: context.actor.id,
          sessionId: context.sessionId,
          tenantId: context.tenantId ?? null,
          conversationId: context.conversationId ?? null,
          kind,
          feature: snapshot.input.feature,
          source: snapshot.source,
          modelId: snapshot.input.model.id,
          configurationVersion: snapshot.configuration.version,
          connectionRevision: snapshot.credential.revision,
        },
      });
      return { operation, created: true };
    });
  }
  private async recordEstimate(
    context: AiContext,
    operation: AiOperation,
    snapshot: Snapshot,
    inputTokens: number,
  ) {
    // Informational only: estimates never gate generation or spend a budget.
    return this.repository.run(context, (tx) =>
      tx.aiOperation.update({
        where: { id: operation.id },
        data: {
          reservedTokens: inputTokens + snapshot.input.maxOutputTokens,
          status: "running",
        },
      }),
    );
  }
  private async *execute(
    context: AiContext,
    operation: AiOperation,
    snapshot: Snapshot,
    contents: AiContent[],
    externalSignal?: AbortSignal,
  ): AsyncIterable<AiGenerationEvent> {
    const control = new AbortController();
    this.active.set(operation.id, { control, sessionId: context.sessionId });
    const signal = AbortSignal.any([
      control.signal,
      snapshot.credential.signal,
      AbortSignal.timeout(this.config.CHAT_TIMEOUT_MS),
      ...(externalSignal ? [externalSignal] : []),
    ]);
    let usage = emptyUsage(),
      sent = false,
      status = "interrupted",
      failureCode: ReturnType<typeof errorCode> | null =
        "AI_PROVIDER_UNAVAILABLE",
      checking = false;
    const heartbeat = setInterval(() => {
      if (checking) return;
      checking = true;
      void this.repository
        .run(context, async (tx) => {
          const op = await tx.aiOperation.findUnique({
            where: { id: operation.id },
          });
          if (!op || op.cancelRequested) throw new Error();
          if (snapshot.source === "temporary")
            await this.repository.assertGlobalSession(context);
          await tx.aiOperation.update({
            where: { id: operation.id },
            data: { updatedAt: new Date() },
          });
        })
        .catch(() => control.abort())
        .finally(() => {
          checking = false;
        });
    }, 2000);
    heartbeat.unref();
    try {
      const input = { ...snapshot.input, contents };
      const count = await this.provider.countTokens(
        snapshot.credential,
        input,
        signal,
      );
      await this.recordEstimate(context, operation, snapshot, count);
      signal.throwIfAborted();
      await this.repository.run(context, (tx) =>
        tx.aiOperation.update({
          where: { id: operation.id },
          data: { sentAt: new Date() },
        }),
      );
      sent = true;
      for await (const event of this.provider.generate(
        snapshot.credential,
        input,
        signal,
      )) {
        signal.throwIfAborted();
        if (event.type === "usage") usage = event.usage;
        yield event;
      }
      status = "completed";
      failureCode = null;
    } catch (error) {
      status = signal.aborted ? "cancelled" : "failed";
      failureCode = snapshot.credential.signal.aborted
        ? "AI_CONNECTION_EXPIRED"
        : signal.aborted
          ? "AI_TIMEOUT"
          : errorCode(error);
      if (
        failureCode === "AI_CREDENTIAL_REJECTED" &&
        snapshot.source === "managed"
      ) {
        this.managed.invalidate();
        this.catalog.invalidate("managed");
      }
      throw new AppError(502, failureCode);
    } finally {
      clearInterval(heartbeat);
      this.active.delete(operation.id);
      await this.repository.worker((tx) =>
        tx.aiOperation.update({
          where: { id: operation.id },
          data: {
            status,
            failureCode,
            inputTokens: usage.input,
            outputTokens: usage.output,
            thinkingTokens: usage.thinking,
            totalTokens: status === "completed" ? usage.total : null,
            ...(!sent ? { reservedTokens: 0 } : {}),
            updatedAt: new Date(),
          },
        }),
      );
    }
  }
  async *chat(
    context: AiContext,
    id: string,
    contents: AiContent[],
    signal: AbortSignal,
  ) {
    const snapshot = await this.snapshot(context, "chatText");
    const { operation, created } = await this.newOperation(
      context,
      id,
      snapshot,
      "chat",
    );
    if (!created) throw new AppError(409, "CONFLICT");
    for await (const event of this.execute(
      context,
      operation,
      snapshot,
      contents,
      signal,
    ))
      if (event.type === "text") yield event.text;
  }
  async startTest(context: AiContext, input: AiModelTestInput) {
    await this.repository.assertGlobalSession(context);
    const old = await this.repository.run(context, (tx) =>
      tx.aiOperation.findFirst({
        where: {
          id: input.operationId,
          actorId: context.actor.id,
          sessionId: context.sessionId,
          kind: "test",
        },
      }),
    );
    if (old) {
      if (
        old.modelId !== input.modelId ||
        old.source !== input.source ||
        old.feature !== input.feature
      )
        throw new AppError(409, "CONFLICT");
      return this.readTest(context, input.operationId);
    }
    const snapshot = await this.snapshot(context, input.feature, input);
    const { operation, created } = await this.newOperation(
      context,
      input.operationId,
      snapshot,
      "test",
    );
    if (created)
      void this.executeTest(context, operation, snapshot).catch(() => {});
    return this.readTest(context, operation.id);
  }
  private async executeTest(
    context: AiContext,
    operation: AiOperation,
    snapshot: Snapshot,
  ) {
    const contents: AiContent[] = [
      {
        role: "user",
        parts: [
          {
            text:
              operation.feature === "chatText"
                ? "Respond with one short sentence confirming that this connection works."
                : "Create exactly one simple image: a blue circle on a plain white background. No text, no people.",
          },
        ],
      },
    ];
    const result: Result = {
      sessionId: context.sessionId,
      expiresAt: Date.now() + 300000,
      text: "",
      signal: snapshot.credential.signal,
    };
    if (this.results.size >= 20)
      this.results.delete(this.results.keys().next().value!);
    this.results.set(operation.id, result);
    try {
      for await (const event of this.execute(
        context,
        operation,
        snapshot,
        contents,
      )) {
        if (event.type === "text") result.text += event.text;
        if (event.type === "image") result.image = event.bytes;
      }
      result.expiresAt = Date.now() + 300000;
    } catch (error) {
      this.results.delete(operation.id);
      throw error;
    }
  }
  async readTest(context: AiContext, id: string): Promise<PublicOperation> {
    await this.repository.assertGlobalSession(context);
    const op = await this.repository.run(context, (tx) =>
      tx.aiOperation.findFirst({
        where: {
          id,
          actorId: context.actor.id,
          sessionId: context.sessionId,
          kind: "test",
        },
      }),
    );
    if (!op) throw new AppError(404, "NOT_FOUND");
    const result = this.result(context, id);
    return {
      id: op.id,
      feature: op.feature as AiFeature,
      modelId: op.modelId,
      status: op.status as PublicOperation["status"],
      errorCode: op.failureCode
        ? errorCode(new AppError(502, aiErrorCodeSchema.parse(op.failureCode)))
        : null,
      text: result?.text ?? null,
      previewAvailable: !!result?.image,
      previewExpiresAt: result?.image
        ? new Date(result.expiresAt).toISOString()
        : null,
      usage: {
        input: op.inputTokens,
        output: op.outputTokens,
        thinking: op.thinkingTokens,
        total: op.totalTokens,
      },
    };
  }
  private result(context: AiContext, id: string) {
    const result = this.results.get(id);
    if (!result || result.sessionId !== context.sessionId) return undefined;
    if (result.expiresAt <= Date.now() || result.signal.aborted) {
      this.results.delete(id);
      return undefined;
    }
    return result;
  }
  async image(context: AiContext, id: string) {
    await this.readTest(context, id);
    const result = this.result(context, id);
    if (!result?.image) throw new AppError(410, "AI_PREVIEW_EXPIRED");
    return result.image;
  }
  async cancelTest(context: AiContext, id: string) {
    await this.readTest(context, id);
    await this.repository.run(context, (tx) =>
      tx.aiOperation.update({ where: { id }, data: { cancelRequested: true } }),
    );
    this.active.get(id)?.control.abort();
    return { ok: true };
  }
  async usage(context: AiContext, source?: AiSource): Promise<AiUsage> {
    await this.repository.assertGlobalSession(context);
    const configuration = await this.configuration(context),
      start = hourStart(),
      selectedSource = source ?? configuration.source,
      temporary = selectedSource === "temporary";
    const rows = await this.repository.run(
      context,
      (tx) =>
        tx.aiOperation.findMany({
          where: {
            environment: this.environment,
            source: selectedSource,
            createdAt: { gte: start },
            ...(this.localEnvironment ? { actorId: context.actor.id } : {}),
          },
        }),
      true,
    );
    const sum = (
      key: "inputTokens" | "outputTokens" | "thinkingTokens" | "totalTokens",
    ) => rows.reduce((n, r) => n + (r[key] ?? 0), 0);
    return {
      scope: temporary ? "local" : "managed",
      windowStart: start.toISOString(),
      resetsAt: new Date(start.getTime() + 3600000).toISOString(),
      confirmed: sum("totalTokens"),
      reserved: rows
        .filter((r) => ["queued", "running"].includes(r.status))
        .reduce((n, r) => n + r.reservedTokens, 0),
      estimated: rows
        .filter(
          (r) =>
            !["queued", "running"].includes(r.status) && r.totalTokens === null,
        )
        .reduce((n, r) => n + r.reservedTokens, 0),
      input: sum("inputTokens"),
      output: sum("outputTokens"),
      thinking: sum("thinkingTokens"),
      unknownOperations: rows.filter(
        (r) =>
          r.sentAt &&
          r.totalTokens === null &&
          !["queued", "running"].includes(r.status),
      ).length,
      imageOperations: rows.filter(
        (r) => r.feature === "imageGeneration" && r.sentAt,
      ).length,
      tokenLimit: null,
      imageLimit: null,
      providerQuota: null,
      localPolicy: configuration.localPolicy,
    };
  }
  private async cleanup() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      for (const item of this.local.sessions()) {
        const valid = await this.repository.db.metadata.session.findFirst({
          where: {
            id: item.sessionId,
            userId: item.actorId,
            revokedAt: null,
            expiresAt: { gt: new Date() },
            user: { active: true, platformRole: "GLOBAL" },
          },
        });
        if (!valid) this.revokeMemory(item.sessionId);
      }
      for (const [id, result] of this.results)
        if (result.expiresAt <= Date.now() || result.signal.aborted)
          this.results.delete(id);
      await this.repository.worker(async (tx) => {
        await tx.aiOperation.updateMany({
          where: {
            status: { in: ["queued", "running"] },
            updatedAt: { lt: new Date(Date.now() - 30000) },
            sentAt: null,
          },
          data: {
            status: "interrupted",
            failureCode: "AI_PROVIDER_UNAVAILABLE",
            reservedTokens: 0,
          },
        });
        await tx.aiOperation.updateMany({
          where: {
            status: { in: ["queued", "running"] },
            updatedAt: { lt: new Date(Date.now() - 30000) },
          },
          data: {
            status: "interrupted",
            failureCode: "AI_PROVIDER_UNAVAILABLE",
          },
        });
        await tx.$executeRaw`DELETE FROM "AiConfiguration" c WHERE c.scope = 'local' AND NOT EXISTS (SELECT 1 FROM "Session" s JOIN "User" u ON u.id=s."userId" WHERE s.id=c."sessionId" AND s."revokedAt" IS NULL AND s."expiresAt">now())`;
      });
    } finally {
      this.cleaning = false;
    }
  }
}
