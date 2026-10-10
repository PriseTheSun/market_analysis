import {
  Inject,
  Injectable,
  CanActivate,
  ExecutionContext,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { hash, verify, argon2id } from "argon2";
import { DatabaseService, type Tx } from "../database/database.service.js";
import { CONFIG, type Config } from "../common/config.js";
import { AppError } from "../common/errors.js";
import { randomToken, digest } from "../common/crypto.js";
import { AuditService } from "../audit/audit.service.js";
import { EventsService } from "../notifications/events.service.js";
import { MailService } from "../mail/mail.service.js";
import type { Actor } from "../authorization/policy.js";
import type { TenantRole } from "@market/contracts";
export const hashPassword = (password: string) =>
  hash(password, {
    type: argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
export const publicUser = (u: {
  id: string;
  name: string;
  email: string;
  platformRole: "GLOBAL" | null;
  avatarVersion: string | null;
}) => ({
  id: u.id,
  name: u.name,
  email: u.email,
  platformRole: u.platformRole,
  avatarUrl: u.avatarVersion
    ? `/api/v1/preferences/avatar?v=${u.avatarVersion}`
    : null,
});
@Injectable()
export class AuthService {
  private dummy = hashPassword(randomToken());
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(CONFIG) private config: Config,
    @Inject(AuditService) private audit: AuditService,
    @Inject(EventsService) private events: EventsService,
    @Inject(MailService) private mail: MailService,
  ) {}
  async resolve(req: Request) {
    const raw =
      typeof req.cookies?.ma_session === "string" ? req.cookies.ma_session : "";
    if (!raw) return null;
    const session = await this.db.metadata.session.findFirst({
      where: {
        tokenHash: digest(raw),
        revokedAt: null,
        expiresAt: { gt: new Date() },
        user: { active: true },
      },
      include: { user: true },
    });
    if (!session) return null;
    req.actor = {
      id: session.user.id,
      platformRole: session.user.platformRole,
    };
    req.sessionId = session.id;
    return session;
  }
  async login(
    req: Request,
    res: Response,
    data: { email: string; password: string; remember: boolean },
  ) {
    const user = await this.db.metadata.user.findUnique({
      where: { email: data.email },
    });
    const valid = await verify(
      user?.passwordHash ?? (await this.dummy),
      data.password,
    );
    if (!user?.active || !valid) throw new AppError(401, "INVALID_CREDENTIALS");
    const token = randomToken(),
      maxAge = (data.remember ? 30 * 24 : 12) * 3600000;
    await this.db.metadata.$transaction(async (tx) => {
      if (typeof req.cookies?.ma_session === "string")
        await tx.session.updateMany({
          where: { tokenHash: digest(req.cookies.ma_session) },
          data: { revokedAt: new Date() },
        });
      await tx.session.create({
        data: {
          userId: user.id,
          tokenHash: digest(token),
          expiresAt: new Date(Date.now() + maxAge),
        },
      });
      await this.audit.record(
        tx,
        { id: user.id, platformRole: user.platformRole },
        "auth.login",
        req.requestId,
      );
    });
    res.cookie("ma_session", token, {
      httpOnly: true,
      secure: this.config.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(data.remember ? { maxAge } : {}),
    });
    res.clearCookie("ma_pre", { path: "/" });
    return { user: publicUser(user) };
  }
  async logout(req: Request, res: Response) {
    if (typeof req.cookies?.ma_session === "string")
      await this.db.metadata.session.updateMany({
        where: { tokenHash: digest(req.cookies.ma_session) },
        data: { revokedAt: new Date() },
      });
    res.clearCookie("ma_session", { path: "/" });
    res.clearCookie("ma_pre", { path: "/" });
    return { ok: true };
  }
  async recover(email: string) {
    const user = await this.db.metadata.user.findFirst({
      where: { email, active: true },
    });
    if (user) {
      const token = randomToken(),
        expiresAt = new Date(Date.now() + 30 * 60000);
      await this.db.metadata.$transaction(async (tx) => {
        const reset = await tx.passwordReset.create({
          data: { userId: user.id, tokenHash: digest(token), expiresAt },
        });
        await this.mail.queue(
          tx,
          "reset:" + reset.id,
          email,
          "reset",
          token,
          expiresAt,
        );
      });
    }
    return { received: true };
  }
  async reset(token: string, password: string, requestId: string) {
    const protectedPassword = await hashPassword(password);
    await this.db.metadata.$transaction(async (tx) => {
      await this.db.lockAccess(tx);
      const reset = await tx.passwordReset.findFirst({
        where: {
          tokenHash: digest(token),
          consumedAt: null,
          expiresAt: { gt: new Date() },
          user: { active: true },
        },
      });
      if (!reset) throw new AppError(400, "INVALID_TOKEN");
      await tx.passwordReset.update({
        where: { id: reset.id },
        data: { consumedAt: new Date() },
      });
      await tx.user.update({
        where: { id: reset.userId },
        data: { passwordHash: protectedPassword },
      });
      await tx.session.updateMany({
        where: { userId: reset.userId, revokedAt: null },
        data: { revokedAt: new Date() },
      });
      await tx.emailDelivery.updateMany({
        where: { eventKey: "reset:" + reset.id },
        data: { encryptedPayload: null },
      });
      await this.audit.record(
        tx,
        { id: reset.userId, platformRole: null },
        "auth.password-reset",
        requestId,
      );
    });
    return { ok: true };
  }
  async issue(
    tx: Tx,
    actor: Actor,
    tenantId: string,
    email: string,
    role: TenantRole,
    bootstrap = false,
  ) {
    const token = randomToken(),
      expiresAt = new Date(Date.now() + 72 * 3600000);
    const invitation = await tx.invitation.create({
      data: {
        tenantId,
        email,
        role,
        tokenHash: digest(token),
        createdBy: actor.id,
        bootstrap,
        expiresAt,
      },
    });
    await this.mail.queue(
      tx,
      "invitation:" + invitation.id,
      email,
      "invitation",
      token,
      expiresAt,
    );
    return invitation;
  }
  async accept(
    req: Request,
    data: { token: string; password?: string; name?: string },
  ) {
    await this.resolve(req);
    const protectedPassword = data.password
      ? await hashPassword(data.password)
      : null;
    const result = await this.db.metadata.$transaction(async (tx) => {
      await this.db.lockAccess(tx);
      const invite = await tx.invitation.findFirst({
        where: {
          tokenHash: digest(data.token),
          consumedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        include: { tenant: { include: { agency: true } } },
      });
      if (
        !invite ||
        !invite.tenant.agency.active ||
        invite.tenant.status === "disabled" ||
        (invite.tenant.status === "provisioning" && !invite.bootstrap)
      )
        throw new AppError(400, "INVALID_TOKEN");
      let user = await tx.user.findUnique({ where: { email: invite.email } });
      if (user) {
        if (!user.active || req.actor?.id !== user.id)
          throw new AppError(401, "UNAUTHENTICATED");
      } else {
        if (!protectedPassword || !data.name)
          throw new AppError(400, "VALIDATION_ERROR");
        user = await tx.user.create({
          data: {
            email: invite.email,
            name: data.name,
            passwordHash: protectedPassword,
            preference: { create: { locale: "pt-BR", theme: "light" } },
          },
        });
      }
      await tx.tenantMembership.upsert({
        where: {
          tenantId_userId: { tenantId: invite.tenantId, userId: user.id },
        },
        create: {
          tenantId: invite.tenantId,
          userId: user.id,
          role: invite.role,
        },
        update: { role: invite.role, active: true },
      });
      if (
        invite.bootstrap &&
        invite.role === "ADMIN" &&
        invite.tenant.status === "provisioning"
      )
        await tx.tenant.update({
          where: { id: invite.tenantId },
          data: { status: "active" },
        });
      await tx.invitation.update({
        where: { id: invite.id },
        data: { consumedAt: new Date() },
      });
      await tx.emailDelivery.updateMany({
        where: { eventKey: "invitation:" + invite.id },
        data: { encryptedPayload: null },
      });
      await this.db.assertResponsibilities(tx);
      const reviewers = await this.events.reviewers(tx, invite.tenantId);
      if (reviewers.includes(invite.createdBy))
        await this.events.notify(
          tx,
          [invite.createdBy],
          invite.tenantId,
          "invitation.accepted",
          "invitation.accepted:" + invite.id,
          { name: user.name },
          user.id,
        );
      await this.audit.record(
        tx,
        { id: user.id, platformRole: user.platformRole },
        "invitation.accepted",
        req.requestId,
        { tenantId: invite.tenantId, resourceId: invite.id },
      );
      return { accepted: true };
    });
    return result;
  }
}
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(AuthService) private auth: AuthService) {}
  async canActivate(context: ExecutionContext) {
    if (
      !(await this.auth.resolve(context.switchToHttp().getRequest<Request>()))
    )
      throw new AppError(401, "UNAUTHENTICATED");
    return true;
  }
}
