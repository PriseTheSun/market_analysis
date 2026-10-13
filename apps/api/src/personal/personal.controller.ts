import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { Request, Response } from "express";
import {
  AVATAR_MAX_BYTES,
  idSchema,
  paginationSchema,
  preferenceSchema,
  tourSchema,
} from "@market/contracts";
import { AuthModule } from "../auth/auth.module.js";
import { SessionGuard } from "../auth/auth.service.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import { AppError, parse } from "../common/errors.js";
import type { Actor } from "../authorization/policy.js";
import { AvatarService } from "./avatar.service.js";
import { AuditService } from "../audit/audit.service.js";
import { SecurityService } from "../common/security.service.js";
@Controller()
@UseGuards(SessionGuard)
export class PersonalController {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AvatarService) private avatars: AvatarService,
    @Inject(SecurityService) private security: SecurityService,
    @Inject(AuditService) private audit: AuditService,
  ) {}
  @Post("preferences/avatar")
  @UseInterceptors(
    FileInterceptor("image", {
      limits: { fileSize: AVATAR_MAX_BYTES, files: 1, fields: 0, parts: 1 },
    }),
  )
  async uploadAvatar(
    @Req() r: Request,
    @UploadedFile() file: { buffer: Buffer; mimetype: string } | undefined,
  ) {
    await this.security.limit(r, "avatar.upload", 30);
    return this.avatars.save(r.actor!, file, r.requestId);
  }
  @Get("preferences/avatar")
  async avatar(@Req() r: Request, @Res() res: Response) {
    res.setHeader("Cache-Control", "private, no-store");
    const image = await this.avatars.image(r.actor!);
    res.type("image/webp").send(image);
  }
  @Delete("preferences/avatar")
  removeAvatar(@Req() r: Request) {
    return this.avatars.remove(r.actor!, r.requestId);
  }
  @Get("preferences") preferences(@Req() r: Request) {
    return this.db.personal(
      r.actor!,
      async (tx) =>
        (await tx.userPreference.findUnique({
          where: { userId: r.actor!.id },
        })) ?? { locale: "pt-BR", theme: null, timeZone: "America/Sao_Paulo" },
    );
  }
  @Patch("preferences") updatePreferences(
    @Req() r: Request,
    @Body() b: unknown,
  ) {
    const data = parse(preferenceSchema, b);
    return this.db.personal(r.actor!, async (tx, current) => {
      const before = await this.audit.snapshot(
        tx,
        "preferences.updated",
        current.id,
      );
      const value = await tx.userPreference.upsert({
        where: { userId: current.id },
        create: { userId: current.id, ...data },
        update: data,
      });
      if (
        Object.entries(data).some(
          ([key, value]) =>
            before?.fields[key as keyof typeof before.fields] !== value,
        )
      )
        await this.audit.record(
          tx,
          current,
          "preferences.updated",
          r.requestId,
          { resourceId: current.id, before },
        );
      return value;
    });
  }
  @Get("tenants/:tenantId/tour") tour(
    @Req() r: Request,
    @Param("tenantId") t: string,
  ) {
    return this.db.tenant(
      r.actor!,
      parse(idSchema, t),
      "chat",
      r.requestId,
      (tx) =>
        tx.onboardingProgress.findMany({
          where: { userId: r.actor!.id, tenantId: t },
          orderBy: { version: "desc" },
        }),
    );
  }
  @Post("tenants/:tenantId/tour") updateTour(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Body() b: unknown,
  ) {
    const data = parse(tourSchema, b);
    return this.db.tenant(
      r.actor!,
      parse(idSchema, t),
      "chat",
      r.requestId,
      (tx) =>
        tx.onboardingProgress.upsert({
          where: {
            tenantId_userId_version: {
              tenantId: t,
              userId: r.actor!.id,
              version: data.version,
            },
          },
          create: { tenantId: t, userId: r.actor!.id, ...data },
          update: data,
        }),
    );
  }
  private scope<T>(
    r: Request,
    tenantId: string | undefined,
    fn: (tx: Tx, actor: Actor) => Promise<T>,
  ) {
    return tenantId
      ? this.db.tenant(
          r.actor!,
          parse(idSchema, tenantId),
          "chat",
          r.requestId,
          (tx, s) => fn(tx, s.actor),
        )
      : this.db.global(r.actor!, fn);
  }
  private async notificationWhere(tx: Tx, r: Request, t: string | undefined) {
    const scope = t
      ? await this.db.context(tx, r.actor!, t, "chat", r.requestId)
      : null;
    return {
      recipientId: r.actor!.id,
      tenantId: t ?? null,
      ...(scope?.role === "USER"
        ? {
            type: {
              notIn: [
                "file.available",
                "file.failed",
                "access.assigned",
                "access.reviewed",
                "invitation.accepted",
              ],
            },
          }
        : {}),
    };
  }
  @Get(["notifications", "tenants/:tenantId/notifications"]) notifications(
    @Req() r: Request,
    @Param("tenantId") t: string | undefined,
    @Query() q: unknown,
  ) {
    const p = parse(paginationSchema, q);
    return this.scope(r, t, async (tx) => {
      const where = {
        ...(await this.notificationWhere(tx, r, t)),
        readAt: null,
      };
      const [items, total] = await Promise.all([
        tx.notification.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (p.page - 1) * p.pageSize,
          take: p.pageSize,
        }),
        tx.notification.count({ where }),
      ]);
      return {
        items,
        total,
        unread: total,
        page: p.page,
        pageSize: p.pageSize,
      };
    });
  }
  @Post(["notifications/read-all", "tenants/:tenantId/notifications/read-all"])
  readAll(@Req() r: Request, @Param("tenantId") t: string | undefined) {
    return this.scope(r, t, async (tx, current) => {
      const result = await tx.notification.updateMany({
        where: { ...(await this.notificationWhere(tx, r, t)), readAt: null },
        data: { readAt: new Date() },
      });
      if (result.count)
        await this.audit.record(
          tx,
          current,
          "notifications.read-all",
          r.requestId,
          { tenantId: t },
        );
      return result;
    });
  }
  @Post(["notifications/:id/read", "tenants/:tenantId/notifications/:id/read"])
  read(
    @Req() r: Request,
    @Param("tenantId") t: string | undefined,
    @Param("id") id: string,
  ) {
    parse(idSchema, id);
    return this.scope(r, t, async (tx) => {
      const n = await tx.notification.updateMany({
        where: { id, ...(await this.notificationWhere(tx, r, t)) },
        data: { readAt: new Date() },
      });
      if (!n.count) throw new AppError(404, "NOT_FOUND");
      await this.audit.record(tx, r.actor!, "notifications.read", r.requestId, {
        tenantId: t,
        resourceId: id,
      });
      return { ok: true };
    });
  }
}
@Module({
  imports: [AuthModule],
  controllers: [PersonalController],
  providers: [AvatarService],
})
export class PersonalModule {}
