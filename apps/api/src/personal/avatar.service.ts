import { Inject, Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { AVATAR_MAX_BYTES, AVATAR_TYPES } from "@market/contracts";
import type { Actor } from "../authorization/policy.js";
import { DatabaseService } from "../database/database.service.js";
import { AuditService } from "../audit/audit.service.js";
import { AppError } from "../common/errors.js";
import { publicUser } from "../auth/auth.service.js";

@Injectable()
export class AvatarService {
  constructor(
    @Inject(DatabaseService) private db: DatabaseService,
    @Inject(AuditService) private audit: AuditService,
  ) {}

  async save(
    actor: Actor,
    file: { buffer: Buffer; mimetype: string } | undefined,
    requestId: string,
  ) {
    if (
      !file?.buffer.length ||
      !AVATAR_TYPES.some((type) => type === file.mimetype)
    )
      throw new AppError(400, "UPLOAD_INVALID");
    if (file.buffer.length > AVATAR_MAX_BYTES)
      throw new AppError(413, "UPLOAD_TOO_LARGE");
    let image: Buffer;
    try {
      const pipeline = sharp(file.buffer, {
        limitInputPixels: 20_000_000,
        failOn: "warning",
      });
      const metadata = await pipeline.metadata();
      if (
        !metadata.format ||
        !["jpeg", "png", "webp"].includes(metadata.format) ||
        (metadata.pages ?? 1) > 1
      )
        throw new Error("Unsupported avatar");
      // Decode and re-encode to strip metadata and preserve no uploaded payload.
      image = await pipeline
        .rotate()
        .resize(256, 256, { fit: "cover" })
        .webp({ quality: 85 })
        .toBuffer();
      if (image.length > 262144) throw new Error("Avatar too large");
    } catch {
      throw new AppError(400, "UPLOAD_INVALID");
    }
    return this.db.personal(actor, async (tx, current) => {
      // Lock the owning user first so replacement/removal commit atomically.
      const user = await tx.user.update({
        where: { id: current.id },
        data: { avatarVersion: randomUUID() },
      });
      await tx.userAvatar.upsert({
        where: { userId: current.id },
        create: { userId: current.id, image: new Uint8Array(image) },
        update: { image: new Uint8Array(image) },
      });
      await this.audit.record(
        tx,
        current,
        "profile.avatar.updated",
        requestId,
        { resourceId: current.id },
      );
      return publicUser(user);
    });
  }

  image(actor: Actor) {
    return this.db.personal(actor, async (tx, current) => {
      const avatar = await tx.userAvatar.findUnique({
        where: { userId: current.id },
      });
      if (!avatar) throw new AppError(404, "NOT_FOUND");
      return Buffer.from(avatar.image);
    });
  }

  remove(actor: Actor, requestId: string) {
    return this.db.personal(actor, async (tx, current) => {
      const user = await tx.user.update({
        where: { id: current.id },
        data: { avatarVersion: null },
      });
      await tx.userAvatar.deleteMany({ where: { userId: current.id } });
      await this.audit.record(
        tx,
        current,
        "profile.avatar.removed",
        requestId,
        { resourceId: current.id },
      );
      return publicUser(user);
    });
  }
}
