import { Inject, Injectable, NestMiddleware } from "@nestjs/common";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "node:crypto";
import { CONFIG, type Config } from "./config.js";
import { DatabaseService } from "../database/database.service.js";
import { AppError } from "./errors.js";
import { randomToken, mac, equal } from "./crypto.js";
@Injectable()
export class SecurityService implements NestMiddleware {
  constructor(
    @Inject(CONFIG) readonly config: Config,
    @Inject(DatabaseService) private db: DatabaseService,
  ) {}
  use(req: Request, res: Response, next: NextFunction) {
    req.requestId = randomUUID();
    res.setHeader("X-Request-Id", req.requestId);
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) {
      next();
      return;
    }
    const origin = req.get("origin");
    const token = req.get("x-csrf-token") ?? "";
    const session =
      typeof req.cookies?.ma_session === "string" ? req.cookies.ma_session : "";
    const pre =
      typeof req.cookies?.ma_pre === "string" ? req.cookies.ma_pre : "";
    if (
      !origin ||
      !this.config.ALLOWED_ORIGINS.split(",").includes(origin) ||
      !(session || pre) ||
      !equal(token, mac(session || pre, this.config.SESSION_SECRET))
    ) {
      res.status(403).json({
        code: "CSRF_INVALID",
        message: "CSRF_INVALID",
        requestId: req.requestId,
      });
      return;
    }
    next();
  }
  csrf(req: Request, res: Response) {
    let key =
      typeof req.cookies?.ma_session === "string"
        ? req.cookies.ma_session
        : typeof req.cookies?.ma_pre === "string"
          ? req.cookies.ma_pre
          : "";
    if (!key) {
      key = randomToken();
      res.cookie("ma_pre", key, {
        httpOnly: true,
        sameSite: "lax",
        secure: this.config.NODE_ENV === "production",
        path: "/",
        maxAge: 3600000,
      });
    }
    return { token: mac(key, this.config.SESSION_SECRET) };
  }
  async limit(
    req: Request,
    bucket: string,
    limit: number,
    minutes = 15,
    identity = "",
  ) {
    limit = this.config.RATE_LIMITS_JSON[bucket] ?? limit;
    const key = mac(
      [bucket, req.ip ?? "unknown", identity || req.actor?.id || ""].join(":"),
      this.config.SESSION_SECRET,
    );
    const expiresAt = new Date(Date.now() + minutes * 60000);
    const rows = await this.db.metadata.$queryRaw<
      { count: number }[]
    >`INSERT INTO "RateLimit" (key,count,"expiresAt") VALUES (${key},1,${expiresAt}) ON CONFLICT (key) DO UPDATE SET count=CASE WHEN "RateLimit"."expiresAt"<now() THEN 1 ELSE "RateLimit".count+1 END, "expiresAt"=CASE WHEN "RateLimit"."expiresAt"<now() THEN ${expiresAt} ELSE "RateLimit"."expiresAt" END RETURNING count`;
    if ((rows[0]?.count ?? Infinity) > limit)
      throw new AppError(429, "RATE_LIMITED");
  }
}
