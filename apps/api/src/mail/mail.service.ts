import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import nodemailer from "nodemailer";
import { z } from "zod";
import { localizedAppPath } from "@market/contracts";
import { CONFIG, type Config } from "../common/config.js";
import { DatabaseService, type Tx } from "../database/database.service.js";
import { encrypt, decrypt } from "../common/crypto.js";
import { AppError } from "../common/errors.js";
const payloadSchema = z.object({
  token: z.string(),
  locale: z.enum(["pt-BR", "en", "es"]).default("pt-BR"),
});
@Injectable()
export class MailService implements OnModuleInit, OnModuleDestroy {
  private timer?: ReturnType<typeof setInterval>;
  private working = false;
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(CONFIG) private config: Config,
  ) {}
  onModuleInit() {
    this.timer = setInterval(
      () =>
        void this.process().catch(() =>
          process.stderr.write('{"event":"mail.worker.failed"}\n'),
        ),
      3000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }
  async queue(
    tx: Tx,
    eventKey: string,
    recipient: string,
    kind: "invitation" | "reset",
    token: string,
    expiresAt: Date,
    locale: "pt-BR" | "en" | "es" = "pt-BR",
  ) {
    return tx.emailDelivery.upsert({
      where: { eventKey },
      create: {
        eventKey,
        recipient,
        kind,
        encryptedPayload: encrypt({ token, locale }, this.config.OUTBOX_KEY),
        expiresAt,
      },
      update: {},
    });
  }
  async resend(tx: Tx, eventKey: string) {
    const item = await tx.emailDelivery.findUnique({ where: { eventKey } });
    if (!item || item.expiresAt < new Date() || !item.encryptedPayload)
      throw new AppError(409, "INVALID_TOKEN");
    return tx.emailDelivery.update({
      where: { id: item.id },
      data: { status: "pending", nextAttemptAt: new Date(), lastError: null },
    });
  }
  async process() {
    if (this.working) return;
    this.working = true;
    try {
      await this.db.metadata.emailDelivery.updateMany({
        where: {
          expiresAt: { lt: new Date() },
          encryptedPayload: { not: null },
        },
        data: { encryptedPayload: null, status: "expired" },
      });
      const item = await this.db.metadata.$transaction(async (tx) => {
        const rows = await tx.$queryRaw<
          { id: string }[]
        >`SELECT id FROM "EmailDelivery" WHERE status IN ('pending','failed','sending') AND "nextAttemptAt"<=now() AND "expiresAt">now() AND ("lockedUntil" IS NULL OR "lockedUntil"<now()) ORDER BY "createdAt" FOR UPDATE SKIP LOCKED LIMIT 1`;
        if (!rows[0]) return null;
        return tx.emailDelivery.update({
          where: { id: rows[0].id },
          data: {
            status: "sending",
            lockedUntil: new Date(Date.now() + 60000),
            attempts: { increment: 1 },
          },
        });
      });
      if (!item?.encryptedPayload) return;
      try {
        const payload = payloadSchema.parse(
          decrypt(item.encryptedPayload, this.config.OUTBOX_KEY),
        );
        const url = new URL(
          localizedAppPath(
            item.kind === "invitation"
              ? "/aceitar-convite"
              : "/redefinir-senha",
            payload.locale,
          ),
          this.config.APP_ORIGIN,
        );
        url.hash = new URLSearchParams({ token: payload.token }).toString();
        const texts = {
          "pt-BR": {
            invitation: "Seu convite para o Market Analysis",
            reset: "Redefina sua senha do Market Analysis",
            action:
              "Use o link para continuar. O link tem validade limitada e só pode ser utilizado uma vez.",
          },
          en: {
            invitation: "Your Market Analysis invitation",
            reset: "Reset your Market Analysis password",
            action:
              "Use the link to continue. This link expires and can only be used once.",
          },
          es: {
            invitation: "Tu invitación a Market Analysis",
            reset: "Restablece tu contraseña de Market Analysis",
            action:
              "Usa el enlace para continuar. Caduca y solo se puede utilizar una vez.",
          },
        }[payload.locale];
        const transport = nodemailer.createTransport({
          host: this.config.SMTP_HOST,
          port: this.config.SMTP_PORT,
          secure: this.config.SMTP_SECURE === "true",
          connectionTimeout: 10000,
          socketTimeout: 15000,
          ...(this.config.SMTP_USER
            ? {
                auth: {
                  user: this.config.SMTP_USER,
                  pass: this.config.SMTP_PASSWORD,
                },
              }
            : {}),
        });
        await transport.sendMail({
          from: this.config.MAIL_FROM,
          to: item.recipient,
          subject: texts[item.kind as "invitation" | "reset"],
          text: texts.action + "\n\n" + url.toString(),
          messageId: `<${item.id}@marketanalysis.local>`,
        });
        transport.close();
        await this.db.metadata.emailDelivery.update({
          where: { id: item.id },
          data: { status: "sent", lockedUntil: null, lastError: null },
        });
      } catch {
        await this.db.metadata.emailDelivery.update({
          where: { id: item.id },
          data: {
            status: "failed",
            lastError: "SMTP_DELIVERY_FAILED",
            lockedUntil: null,
            nextAttemptAt: new Date(
              Date.now() +
                Math.min(3600000, 2 ** Math.min(item.attempts, 10) * 5000),
            ),
          },
        });
      }
    } finally {
      this.working = false;
    }
  }
}
