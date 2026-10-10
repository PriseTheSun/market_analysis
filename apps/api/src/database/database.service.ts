import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../generated/prisma/client.js";
import { CONFIG, type Config } from "../common/config.js";
import { AppError } from "../common/errors.js";
import {
  permits,
  effectiveRole,
  type Actor,
  type Scope,
  type Action,
} from "../authorization/policy.js";
export type Tx = Prisma.TransactionClient;
@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly metadata: PrismaClient;
  constructor(@Inject(CONFIG) config: Config) {
    this.metadata = new PrismaClient({
      adapter: new PrismaPg({ connectionString: config.DATABASE_URL, max: 12 }),
    });
  }
  async onModuleDestroy() {
    await this.metadata.$disconnect();
  }
  async actor(tx: Tx, actor: Actor) {
    const user = await tx.user.findFirst({
      where: { id: actor.id, active: true },
    });
    if (!user) throw new AppError(401, "UNAUTHENTICATED");
    return { id: user.id, platformRole: user.platformRole };
  }
  async context(
    tx: Tx,
    actor: Actor,
    tenantId: string,
    action: Action,
    requestId: string,
  ): Promise<Scope> {
    const current = await this.actor(tx, actor);
    const tenant = await tx.tenant.findFirst({
      where: { id: tenantId, status: "active", agency: { active: true } },
      include: {
        members: { where: { userId: actor.id, active: true } },
        agency: {
          include: { members: { where: { userId: actor.id, active: true } } },
        },
      },
    });
    if (!tenant) throw new AppError(404, "NOT_FOUND");
    const role = effectiveRole(
      current.platformRole === "GLOBAL",
      tenant.agency.members.length > 0,
      tenant.members[0]?.role ?? null,
    );
    if (!role) throw new AppError(404, "NOT_FOUND");
    if (!permits(role, action)) throw new AppError(403, "FORBIDDEN");
    return {
      actor: current,
      tenantId,
      agencyId: tenant.agencyId,
      role,
      requestId,
    };
  }
  async setContext(tx: Tx, actor: Actor | null, tenantId: string | null) {
    await tx.$queryRaw`SELECT set_config('app.actor_id', ${actor?.id ?? ""}, true), set_config('app.tenant_id', ${tenantId ?? ""}, true), set_config('app.platform_global', ${String(actor?.platformRole === "GLOBAL")}, true)`;
  }
  async tenant<T>(
    actor: Actor,
    tenantId: string,
    action: Action,
    requestId: string,
    fn: (tx: Tx, scope: Scope) => Promise<T>,
    mutatesAccess = false,
  ): Promise<T> {
    return this.metadata.$transaction(
      async (tx) => {
        if (mutatesAccess) await this.lockAccess(tx);
        const scope = await this.context(
          tx,
          actor,
          tenantId,
          action,
          requestId,
        );
        await this.setContext(tx, scope.actor, tenantId);
        return fn(tx, scope);
      },
      { timeout: 10000 },
    );
  }
  async personal<T>(
    actor: Actor,
    fn: (tx: Tx, current: Actor) => Promise<T>,
  ): Promise<T> {
    return this.metadata.$transaction(async (tx) => {
      const current = await this.actor(tx, actor);
      await this.setContext(tx, current, null);
      return fn(tx, current);
    });
  }
  async global<T>(
    actor: Actor,
    fn: (tx: Tx, current: Actor) => Promise<T>,
    mutatesAccess = false,
  ): Promise<T> {
    return this.metadata.$transaction(
      async (tx) => {
        if (mutatesAccess) await this.lockAccess(tx);
        const current = await this.actor(tx, actor);
        if (current.platformRole !== "GLOBAL")
          throw new AppError(403, "FORBIDDEN");
        await this.setContext(tx, current, null);
        return fn(tx, current);
      },
      { timeout: 10000 },
    );
  }
  async lockAccess(tx: Tx) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(7283910042::bigint)::text`;
  }
  async assertResponsibilities(tx: Tx) {
    if (
      !(await tx.user.count({
        where: { active: true, platformRole: "GLOBAL" },
      }))
    )
      throw new AppError(409, "LAST_GLOBAL");
    if (
      await tx.tenant.count({
        where: {
          status: "active",
          members: {
            none: { active: true, role: "ADMIN", user: { active: true } },
          },
        },
      })
    )
      throw new AppError(409, "LAST_ADMIN");
  }
}
