import {
  Inject,
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import {
  S3Client,
  CreateBucketCommand,
  PutBucketCorsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { fileTypeFromBuffer } from "file-type";
import { unzipSync } from "fflate";
import { randomUUID } from "node:crypto";
import { extname } from "node:path";
import { CONFIG, type Config } from "../common/config.js";
import { DatabaseService } from "../database/database.service.js";
import { AppError } from "../common/errors.js";
import type { Actor } from "../authorization/policy.js";
import { AuditService } from "../audit/audit.service.js";
import { EventsService } from "../notifications/events.service.js";
import type { StoredFile } from "../generated/prisma/client.js";
const mime: Record<string, string> = {
  ".pdf": "application/pdf",
  ".txt": "text/plain",
  ".csv": "text/csv",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};
const safe = (name: string) => name.replace(/[\x00-\x1f\x7f/\\"<>]/g, "_");
const view = (f: StoredFile) => ({
  id: f.id,
  name: f.name,
  size: f.size,
  type: f.type,
  status: f.status,
  failureCode: f.failureCode,
  createdAt: f.createdAt,
});
@Injectable()
export class FilesService implements OnModuleInit, OnModuleDestroy {
  readonly client: S3Client;
  readonly publicClient: S3Client;
  private timer?: NodeJS.Timeout;
  private cleaning = false;
  constructor(
    @Inject(CONFIG) private config: Config,
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuditService) private audit: AuditService,
    @Inject(EventsService) private events: EventsService,
  ) {
    const common = {
      region: config.S3_REGION,
      forcePathStyle: true,
      maxAttempts: 2,
      requestHandler: { connectionTimeout: 3000, requestTimeout: 10000 },
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY,
        secretAccessKey: config.S3_SECRET_KEY,
      },
    };
    this.client = new S3Client({ ...common, endpoint: config.S3_ENDPOINT });
    this.publicClient = new S3Client({
      ...common,
      endpoint: config.S3_PUBLIC_ENDPOINT,
    });
  }
  private async initializeStorage() {
    try {
      await this.client.send(
        new CreateBucketCommand({ Bucket: this.config.S3_BUCKET }),
      );
    } catch (e) {
      if (
        !["BucketAlreadyExists", "BucketAlreadyOwnedByYou"].includes(
          (e as Error).name,
        )
      )
        throw e;
    }
    await this.client.send(
      new PutBucketCorsCommand({
        Bucket: this.config.S3_BUCKET,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedOrigins: this.config.ALLOWED_ORIGINS.split(","),
              AllowedMethods: ["GET", "HEAD", "POST"],
              AllowedHeaders: ["*"],
              ExposeHeaders: ["ETag"],
              MaxAgeSeconds: 300,
            },
          ],
        },
      }),
    );
  }
  async onModuleInit() {
    // A healthy S3 HTTP listener can precede SeaweedFS Raft/volume readiness.
    for (let attempt = 0; ; attempt++) {
      try {
        await this.initializeStorage();
        break;
      } catch {
        if (attempt >= 29)
          throw new Error("Storage initialization unavailable");
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
    this.timer = setInterval(
      () =>
        void this.cleanup().catch(() =>
          console.error(JSON.stringify({ event: "storage.cleanup.failed" })),
        ),
      30000,
    );
    this.timer.unref();
  }
  onModuleDestroy() {
    clearInterval(this.timer);
    this.client.destroy();
    this.publicClient.destroy();
  }
  async reserve(
    actor: Actor,
    t: string,
    data: { name: string; size: number; type: string },
    requestId: string,
  ) {
    const extension = extname(data.name).toLowerCase(),
      type = mime[extension];
    if (!type || data.type !== type || data.size > this.config.UPLOAD_MAX_BYTES)
      throw new AppError(400, "UPLOAD_INVALID");
    const file = await this.db.tenant(
      actor,
      t,
      "files",
      requestId,
      async (tx, s) => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${t},4412))::text`;
        const usage = await tx.storedFile.aggregate({
          where: {
            tenantId: t,
            status: { in: ["pending", "uploading", "available", "deleting"] },
          },
          _sum: { size: true },
        });
        if (
          (usage._sum.size ?? 0) + data.size >
          this.config.TENANT_STORAGE_MAX_BYTES
        )
          throw new AppError(409, "UPLOAD_TOO_LARGE");
        const id = randomUUID();
        const file = await tx.storedFile.create({
          data: {
            id,
            tenantId: t,
            authorId: actor.id,
            name: safe(data.name),
            size: data.size,
            type,
            temporaryKey: `temporary/${t}/${id}/${randomUUID()}`,
            objectKey: `files/${t}/${id}/${randomUUID()}`,
            expiresAt: new Date(Date.now() + 300000),
          },
        });
        await this.audit.record(tx, actor, "file.reserved", requestId, {
          tenantId: t,
          agencyId: s.agencyId,
          resourceId: id,
        });
        return file;
      },
    );
    const post = await createPresignedPost(this.publicClient, {
      Bucket: this.config.S3_BUCKET,
      Key: file.temporaryKey,
      Expires: 300,
      Fields: { "Content-Type": type },
      Conditions: [
        ["content-length-range", file.size, file.size],
        ["eq", "$Content-Type", type],
      ],
    });
    return { file: view(file), upload: post, expiresAt: file.expiresAt };
  }
  list(
    actor: Actor,
    t: string,
    p: { page: number; pageSize: number; search: string },
    requestId: string,
  ) {
    return this.db.tenant(actor, t, "files", requestId, async (tx) => {
      const where = {
        tenantId: t,
        status: { not: "deleted" as const },
        name: { contains: p.search, mode: "insensitive" as const },
      };
      const [items, total] = await Promise.all([
        tx.storedFile.findMany({
          where,
          orderBy: { createdAt: "desc" },
          skip: (p.page - 1) * p.pageSize,
          take: p.pageSize,
        }),
        tx.storedFile.count({ where }),
      ]);
      return {
        items: items.map(view),
        total,
        page: p.page,
        pageSize: p.pageSize,
      };
    });
  }
  private async validate(file: StoredFile) {
    const head = await this.client.send(
      new HeadObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: file.objectKey,
      }),
    );
    if (head.ContentLength !== file.size || head.ContentType !== file.type)
      throw new AppError(400, "UPLOAD_INVALID");
    const object = await this.client.send(
      new GetObjectCommand({
        Bucket: this.config.S3_BUCKET,
        Key: file.objectKey,
      }),
    );
    if (!object.Body) throw new AppError(400, "UPLOAD_INVALID");
    const bytes = await object.Body.transformToByteArray();
    if (bytes.length !== file.size) throw new AppError(400, "UPLOAD_INVALID");
    const ext = extname(file.name).toLowerCase();
    if (ext === ".pdf") {
      if ((await fileTypeFromBuffer(bytes))?.mime !== "application/pdf")
        throw new AppError(400, "UPLOAD_INVALID");
    } else if (ext === ".xlsx") {
      const detected = await fileTypeFromBuffer(bytes);
      if (
        !detected ||
        !["application/zip", mime[".xlsx"]].includes(detected.mime)
      )
        throw new AppError(400, "UPLOAD_INVALID");
      try {
        let total = 0;
        const content = unzipSync(bytes, {
          filter: (f) => {
            total += f.originalSize;
            if (total > 100 * 1024 * 1024 || f.originalSize > 20 * 1024 * 1024)
              throw new Error("zip limits");
            return ["[Content_Types].xml", "xl/workbook.xml"].includes(f.name);
          },
        });
        if (!content["[Content_Types].xml"] || !content["xl/workbook.xml"])
          throw new Error("not workbook");
      } catch {
        throw new AppError(400, "UPLOAD_INVALID");
      }
    } else {
      try {
        const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
        if (text.includes("\0")) throw new Error("binary");
      } catch {
        throw new AppError(400, "UPLOAD_INVALID");
      }
    }
  }
  async finalize(actor: Actor, t: string, id: string, requestId: string) {
    const file = await this.db.tenant(
      actor,
      t,
      "files",
      requestId,
      async (tx) => {
        const f = await tx.storedFile.findFirst({ where: { id, tenantId: t } });
        if (!f) throw new AppError(404, "NOT_FOUND");
        if (f.status === "available") return f;
        if (f.status !== "pending" || f.expiresAt < new Date())
          throw new AppError(409, "CONFLICT");
        const updated = await tx.storedFile.updateMany({
          where: { id, status: "pending" },
          data: { status: "uploading" },
        });
        if (!updated.count) throw new AppError(409, "CONFLICT");
        return f;
      },
    );
    if (file.status === "available") return view(file);
    try {
      await this.client.send(
        new CopyObjectCommand({
          Bucket: this.config.S3_BUCKET,
          Key: file.objectKey,
          CopySource: `${this.config.S3_BUCKET}/${file.temporaryKey}`,
        }),
      );
      await this.validate(file);
      return await this.db.tenant(
        actor,
        t,
        "files",
        requestId,
        async (tx, s) => {
          const f = await tx.storedFile.findFirst({
            where: { id, status: "uploading" },
          });
          if (!f) throw new AppError(409, "CONFLICT");
          const result = await tx.storedFile.update({
            where: { id },
            data: { status: "available" },
          });
          await this.audit.record(tx, actor, "file.available", requestId, {
            tenantId: t,
            agencyId: s.agencyId,
            resourceId: id,
          });
          await this.events.notify(
            tx,
            [actor.id],
            t,
            "file.available",
            `file.available:${id}`,
            { name: file.name },
            id,
          );
          return view(result);
        },
      );
    } catch (e) {
      await this.internal(t, async (tx) => {
        await tx.storedFile.updateMany({
          where: { id, status: "uploading" },
          data: { status: "failed", failureCode: "UPLOAD_INVALID" },
        });
        await this.audit.record(tx, actor, "file.failed", requestId, {
          tenantId: t,
          resourceId: id,
          result: "failure",
        });
        const user = await tx.user.findFirst({
          where: { id: actor.id, active: true },
        });
        if (user)
          await this.events.notify(
            tx,
            [actor.id],
            t,
            "file.failed",
            `file.failed:${id}`,
            { name: file.name },
            id,
          );
      });
      throw e instanceof AppError
        ? e
        : new AppError(503, "SERVICE_UNAVAILABLE");
    }
  }
  async download(actor: Actor, t: string, id: string, requestId: string) {
    const file = await this.db.tenant(
      actor,
      t,
      "files",
      requestId,
      async (tx) => {
        const f = await tx.storedFile.findFirst({
          where: { id, tenantId: t, status: "available" },
        });
        if (!f) throw new AppError(404, "NOT_FOUND");
        await this.audit.record(tx, actor, "file.download", requestId, {
          tenantId: t,
          resourceId: id,
        });
        return f;
      },
    );
    return {
      url: await getSignedUrl(
        this.publicClient,
        new GetObjectCommand({
          Bucket: this.config.S3_BUCKET,
          Key: file.objectKey,
          ResponseContentDisposition: `attachment; filename="download${extname(file.name)}"; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        }),
        { expiresIn: 60 },
      ),
      expiresIn: 60,
    };
  }
  async remove(actor: Actor, t: string, id: string, requestId: string) {
    const file = await this.db.tenant(
      actor,
      t,
      "files",
      requestId,
      async (tx) => {
        const f = await tx.storedFile.findFirst({ where: { id, tenantId: t } });
        if (!f) throw new AppError(404, "NOT_FOUND");
        if (f.status === "deleted") return f;
        await tx.storedFile.update({
          where: { id },
          data: { status: "deleting", cleanedAt: null },
        });
        await this.audit.record(tx, actor, "file.delete.requested", requestId, {
          tenantId: t,
          resourceId: id,
        });
        return f;
      },
    );
    if (file.status === "deleted") return { ok: true };
    await this.deleteObjects(file);
    await this.internal(t, async (tx) => {
      const completed = await tx.storedFile.updateMany({
        where: { id, status: { not: "deleted" } },
        data: { status: "deleted" },
      });
      if (completed.count)
        await this.audit.record(tx, actor, "file.deleted", requestId, {
          tenantId: t,
          resourceId: id,
        });
    });
    return { ok: true };
  }
  private internal<T>(
    t: string,
    fn: (tx: import("../database/database.service.js").Tx) => Promise<T>,
  ) {
    return this.db.metadata.$transaction(async (tx) => {
      await this.db.setContext(tx, null, t);
      return fn(tx);
    });
  }
  private async deleteObjects(f: StoredFile) {
    for (const Key of [f.objectKey, f.temporaryKey])
      await this.client.send(
        new DeleteObjectCommand({ Bucket: this.config.S3_BUCKET, Key }),
      );
  }
  async cleanup() {
    if (this.cleaning) return;
    this.cleaning = true;
    try {
      const tenants = await this.db.metadata.tenant.findMany({
        select: { id: true },
      });
      for (const t of tenants) {
        const files = await this.internal(t.id, (tx) =>
          tx.storedFile.findMany({
            where: {
              cleanedAt: null,
              OR: [
                { status: "deleting" },
                {
                  status: {
                    in: [
                      "pending",
                      "uploading",
                      "failed",
                      "deleted",
                      "available",
                    ],
                  },
                  expiresAt: { lt: new Date() },
                },
              ],
            },
            take: 100,
          }),
        );
        for (const f of files) {
          if (f.status === "available") {
            await this.client.send(
              new DeleteObjectCommand({
                Bucket: this.config.S3_BUCKET,
                Key: f.temporaryKey,
              }),
            );
            await this.internal(t.id, (tx) =>
              tx.storedFile.update({
                where: { id: f.id },
                data: { cleanedAt: new Date() },
              }),
            );
            continue;
          }
          await this.deleteObjects(f);
          await this.internal(t.id, async (tx) => {
            const completed = await tx.storedFile.updateMany({
              where: { id: f.id, status: f.status },
              data: {
                cleanedAt: new Date(),
                status: ["deleting", "deleted"].includes(f.status)
                  ? "deleted"
                  : "failed",
                failureCode: ["pending", "uploading"].includes(f.status)
                  ? "UPLOAD_INTERRUPTED"
                  : f.failureCode,
              },
            });
            if (completed.count && f.status === "deleting")
              await this.audit.record(tx, null, "file.deleted", randomUUID(), {
                tenantId: t.id,
                resourceId: f.id,
              });
          });
        }
      }
    } finally {
      this.cleaning = false;
    }
  }
}
