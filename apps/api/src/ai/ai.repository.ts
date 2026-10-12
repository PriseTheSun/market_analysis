import { Inject, Injectable } from "@nestjs/common";
import { DatabaseService, type Tx } from "../database/database.service.js";
import type { Actor } from "../authorization/policy.js";
import { AppError } from "../common/errors.js";

export interface AiContext {
  actor: Actor;
  sessionId: string;
  requestId: string;
  tenantId?: string;
  conversationId?: string;
}
@Injectable()
export class AiRepository {
  constructor(@Inject(DatabaseService) readonly db: DatabaseService) {}
  async run<T>(
    context: AiContext,
    fn: (tx: Tx) => Promise<T>,
    admin = false,
  ): Promise<T> {
    const execute = async (tx: Tx) => {
      const session = await tx.session.findFirst({
        where: {
          id: context.sessionId,
          userId: context.actor.id,
          revokedAt: null,
          expiresAt: { gt: new Date() },
          user: { active: true },
        },
      });
      if (!session) throw new AppError(401, "UNAUTHENTICATED");
      if (
        context.conversationId &&
        !(await tx.conversation.findFirst({
          where: {
            id: context.conversationId,
            tenantId: context.tenantId,
            ownerId: context.actor.id,
          },
        }))
      )
        throw new AppError(404, "NOT_FOUND");
      await tx.$queryRaw`SELECT set_config('app.ai_session_id', ${context.sessionId}, true), set_config('app.ai_execution','true',true), set_config('app.ai_admin', ${String(admin)}, true)`;
      return fn(tx);
    };
    if (admin || !context.tenantId)
      return this.db.global(context.actor, execute);
    return this.db.tenant(
      context.actor,
      context.tenantId,
      "chat",
      context.requestId,
      execute,
    );
  }
  worker<T>(fn: (tx: Tx) => Promise<T>) {
    return this.db.metadata.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT set_config('app.ai_worker','true',true)`;
      return fn(tx);
    });
  }
  async assertGlobalSession(context: AiContext) {
    await this.run(
      {
        actor: context.actor,
        sessionId: context.sessionId,
        requestId: context.requestId,
      },
      async () => {},
      true,
    );
  }
}
