import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { randomUUID } from "node:crypto";
import type { z } from "zod";
import type { messageSchema } from "@market/contracts";
import { CONFIG, type Config } from "../common/config.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import { AuthService } from "../auth/auth.service.js";
import { AppError } from "../common/errors.js";
import { AuditService } from "../audit/audit.service.js";
import type { Actor } from "../authorization/policy.js";
import { createProvider, type ChatProvider } from "./chat.provider.js";
import type { OperationStatus } from "../generated/prisma/enums.js";
@Injectable()
export class ChatService implements OnModuleInit, OnModuleDestroy {
  readonly provider: ChatProvider;
  private timer?: NodeJS.Timeout;
  private recovering = false;
  private active = new Map<string, AbortController>();
  constructor(
    @Inject(CONFIG) private config: Config,
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuthService) private auth: AuthService,
    @Inject(AuditService) private audit: AuditService,
  ) {
    this.provider = createProvider(config.CHAT_PROVIDER, config.NODE_ENV);
  }
  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.recover().catch(() =>
          console.error(JSON.stringify({ event: "chat.recovery.failed" })),
        ),
      10000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
    for (const control of this.active.values()) control.abort();
  }
  private internal<T>(t: string, fn: (tx: Tx) => Promise<T>) {
    return this.db.metadata.$transaction(async (tx) => {
      await this.db.setContext(tx, null, t);
      return fn(tx);
    });
  }
  private async own(tx: Tx, actor: Actor, t: string, id: string) {
    const c = await tx.conversation.findFirst({
      where: { id, tenantId: t, ownerId: actor.id },
    });
    if (!c) throw new AppError(404, "NOT_FOUND");
    return c;
  }
  list(actor: Actor, t: string, requestId: string) {
    return this.db.tenant(actor, t, "chat", requestId, async (tx) => ({
      items: await tx.conversation.findMany({
        where: { tenantId: t, ownerId: actor.id },
        orderBy: { updatedAt: "desc" },
        take: 100,
      }),
      provider: this.provider.mode,
    }));
  }
  create(
    actor: Actor,
    t: string,
    title: string | undefined,
    requestId: string,
  ) {
    return this.db.tenant(actor, t, "chat", requestId, (tx) =>
      tx.conversation.create({
        data: { tenantId: t, ownerId: actor.id, title: title ?? "" },
      }),
    );
  }
  read(actor: Actor, t: string, id: string, requestId: string) {
    return this.db.tenant(actor, t, "chat", requestId, async (tx) => {
      const c = await this.own(tx, actor, t, id);
      return {
        ...c,
        messages: await tx.message.findMany({
          where: { conversationId: id, tenantId: t },
          orderBy: { position: "asc" },
        }),
        operations: await tx.chatOperation.findMany({
          where: { conversationId: id, tenantId: t },
          orderBy: { createdAt: "asc" },
        }),
      };
    });
  }
  auditList(actor: Actor, t: string, reason: string, requestId: string) {
    return this.db.global(actor, async (tx, current) => {
      await this.db.context(tx, current, t, "chat", requestId);
      await this.db.setContext(tx, current, t);
      await this.audit.record(
        tx,
        current,
        "conversation.audit.list",
        requestId,
        { tenantId: t, reason },
      );
      return {
        items: await tx.conversation.findMany({
          where: { tenantId: t },
          orderBy: { updatedAt: "desc" },
          take: 100,
          include: { owner: { select: { name: true, email: true } } },
        }),
      };
    });
  }
  auditRead(
    actor: Actor,
    t: string,
    id: string,
    reason: string,
    requestId: string,
  ) {
    return this.db.global(actor, async (tx, current) => {
      await this.db.context(tx, current, t, "chat", requestId);
      await this.db.setContext(tx, current, t);
      const c = await tx.conversation.findFirst({
        where: { id, tenantId: t },
        include: { messages: { orderBy: { position: "asc" } } },
      });
      if (!c) throw new AppError(404, "NOT_FOUND");
      await this.audit.record(
        tx,
        current,
        "conversation.audit.read",
        requestId,
        { tenantId: t, resourceId: id, reason },
      );
      return c;
    });
  }
  async cancel(actor: Actor, t: string, id: string, requestId: string) {
    await this.db.tenant(actor, t, "chat", requestId, async (tx) => {
      const op = await tx.chatOperation.findFirst({
        where: { id, tenantId: t, userId: actor.id },
      });
      if (!op) throw new AppError(404, "NOT_FOUND");
      await tx.chatOperation.update({
        where: { id },
        data: { cancelRequested: true },
      });
    });
    this.active.get(id)?.abort();
    return { ok: true };
  }
  async stream(
    req: Request,
    res: Response,
    t: string,
    id: string,
    data: z.infer<typeof messageSchema>,
  ) {
    const actor = req.actor!;
    if (this.provider.mode === "unavailable")
      throw new AppError(503, "SERVICE_UNAVAILABLE");
    const start = await this.db.tenant(
      actor,
      t,
      "chat",
      req.requestId,
      async (tx) => {
        await this.own(tx, actor, t, id);
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${id},9842))::text`;
        const existing = await tx.chatOperation.findFirst({
          where: { id: data.operationId },
        });
        if (existing) {
          if (existing.userId !== actor.id || existing.conversationId !== id)
            throw new AppError(409, "CONFLICT");
          const original = await tx.message.findFirst({
            where: { id: existing.userMessageId },
          });
          if (original?.content !== data.content)
            throw new AppError(409, "CONFLICT");
          return {
            existing: true,
            op: existing,
            message: await tx.message.findFirst({
              where: { operationId: existing.id, role: "assistant" },
            }),
          };
        }
        if (
          await tx.chatOperation.count({
            where: {
              conversationId: id,
              status: { in: ["pending", "streaming"] },
            },
          })
        )
          throw new AppError(409, "OPERATION_ACTIVE");
        const nextPosition =
          ((
            await tx.message.aggregate({
              where: { tenantId: t, conversationId: id },
              _max: { position: true },
            })
          )._max.position ?? 0) + 1;
        let userMessageId: string = randomUUID();
        if (data.retryOf) {
          const original = await tx.message.findFirst({
            where: {
              id: data.retryOf,
              conversationId: id,
              role: "user",
              content: data.content,
            },
          });
          if (!original) throw new AppError(400, "VALIDATION_ERROR");
          userMessageId = original.id;
          const previous = await tx.chatOperation.findFirst({
            where: { userMessageId },
            orderBy: { createdAt: "desc" },
          });
          if (previous?.status === "completed")
            throw new AppError(409, "CONFLICT");
        } else
          await tx.message.create({
            data: {
              id: userMessageId,
              tenantId: t,
              conversationId: id,
              role: "user",
              position: nextPosition,
              content: data.content,
              status: "completed",
              operationId: data.operationId,
            },
          });
        const op = await tx.chatOperation.create({
          data: {
            id: data.operationId,
            tenantId: t,
            conversationId: id,
            userId: actor.id,
            userMessageId,
            status: "streaming",
          },
        });
        const message = await tx.message.create({
          data: {
            tenantId: t,
            conversationId: id,
            role: "assistant",
            position: data.retryOf ? nextPosition : nextPosition + 1,
            content: "",
            status: "streaming",
            operationId: op.id,
          },
        });
        await tx.conversation.update({
          where: { id },
          data: { updatedAt: new Date() },
        });
        return { existing: false, op, message };
      },
    );
    res.status(200);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
      Connection: "keep-alive",
    });
    res.flushHeaders();
    const emit = (event: string, value: unknown) => {
      if (!res.destroyed)
        res.write(`event: ${event}\ndata: ${JSON.stringify(value)}\n\n`);
    };
    emit("start", {
      operationId: start.op.id,
      userMessageId: start.op.userMessageId,
      messageId: start.message?.id,
      provider: this.provider.mode,
      existing: start.existing,
    });
    if (start.existing) {
      emit("snapshot", {
        content: start.message?.content ?? "",
        status: start.op.status,
      });
      res.end();
      return;
    }
    const control = new AbortController();
    this.active.set(start.op.id, control);
    let content = "",
      status: OperationStatus = "completed",
      checking = false;
    const disconnected = () => control.abort();
    res.on("close", disconnected);
    const timeout = setTimeout(
      () => control.abort(),
      this.config.CHAT_TIMEOUT_MS,
    );
    const heartbeat = setInterval(() => {
      if (checking) return;
      checking = true;
      void (async () => {
        const session = await this.auth.resolve(req);
        if (!session) throw new AppError(401, "UNAUTHENTICATED");
        await this.db.tenant(actor, t, "chat", req.requestId, async (tx) => {
          const op = await tx.chatOperation.findFirst({
            where: { id: start.op.id, userId: actor.id },
          });
          if (!op || op.cancelRequested) throw new AppError(403, "FORBIDDEN");
          await tx.chatOperation.update({
            where: { id: op.id },
            data: { updatedAt: new Date() },
          });
        });
        if (!res.destroyed) res.write(": heartbeat\n\n");
      })()
        .catch(() => control.abort())
        .finally(() => {
          checking = false;
        });
    }, 2000);
    try {
      for await (const chunk of this.provider.stream(
        { content: data.content, locale: data.locale },
        control.signal,
      )) {
        if (control.signal.aborted) throw new Error("cancelled");
        content += chunk;
        if (content.length > this.config.CHAT_OUTPUT_MAX_CHARS)
          throw new Error("output limit");
        await this.internal(t, async (tx) => {
          await tx.message.update({
            where: { id: start.message!.id },
            data: { content },
          });
        });
        emit("delta", { text: chunk });
      }
    } catch {
      status = control.signal.aborted ? "cancelled" : "failed";
    } finally {
      clearInterval(heartbeat);
      clearTimeout(timeout);
      res.off("close", disconnected);
      this.active.delete(start.op.id);
      await this.internal(t, async (tx) => {
        await tx.message.update({
          where: { id: start.message!.id },
          data: { content, status },
        });
        await tx.chatOperation.update({
          where: { id: start.op.id },
          data: {
            status,
            failureCode: status === "completed" ? null : status.toUpperCase(),
          },
        });
      });
      emit("done", { status });
      res.end();
    }
  }
  private async recover() {
    if (this.recovering) return;
    this.recovering = true;
    try {
      for (const t of await this.db.metadata.tenant.findMany({
        select: { id: true },
      })) {
        await this.internal(t.id, async (tx) => {
          const stale = await tx.chatOperation.findMany({
            where: {
              status: { in: ["pending", "streaming"] },
              updatedAt: { lt: new Date(Date.now() - 30000) },
            },
          });
          for (const op of stale) {
            await tx.chatOperation.update({
              where: { id: op.id },
              data: { status: "interrupted", failureCode: "INTERRUPTED" },
            });
            await tx.message.updateMany({
              where: { operationId: op.id, role: "assistant" },
              data: { status: "interrupted" },
            });
          }
        });
      }
    } finally {
      this.recovering = false;
    }
  }
}
