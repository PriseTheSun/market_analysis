import {
  Body,
  Controller,
  Get,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
  HttpCode,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  loginSchema,
  recoverySchema,
  resetSchema,
  invitationAcceptSchema,
} from "@market/contracts";
import { parse } from "../common/errors.js";
import { AuthService, SessionGuard, publicUser } from "./auth.service.js";
import { SecurityService } from "../common/security.service.js";
import { DatabaseService } from "../database/database.service.js";
@Controller("auth")
export class AuthController {
  constructor(
    @Inject(AuthService) private auth: AuthService,
    @Inject(SecurityService) private security: SecurityService,
    @Inject(DatabaseService) private db: DatabaseService,
  ) {}
  @Get("csrf") csrf(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    res.setHeader("Cache-Control", "no-store");
    return this.security.csrf(req, res);
  }
  @Post("login") @HttpCode(200) async login(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
    @Body() body: unknown,
  ) {
    const data = parse(loginSchema, body);
    await this.security.limit(req, "login.ip", 100, 15);
    await this.security.limit(req, "login", 20, 15, data.email);
    return this.auth.login(req, res, data);
  }
  @Post("logout") @HttpCode(200) logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.auth.logout(req, res);
  }
  @Get("session") @UseGuards(SessionGuard) session(@Req() req: Request) {
    return this.db.personal(req.actor!, async (tx) => {
      const user = await tx.user.findUniqueOrThrow({
        where: { id: req.actor!.id },
        include: { preference: true },
      });
      return {
        user: publicUser(user),
        preference: user.preference ?? {
          locale: "pt-BR",
          theme: null,
          timeZone: "America/Sao_Paulo",
        },
      };
    });
  }
  @Post("recover") @HttpCode(202) async recover(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    const data = parse(recoverySchema, body);
    await this.security.limit(req, "recover", 5, 15);
    return this.auth.recover(data.email);
  }
  @Post("reset") async reset(@Req() req: Request, @Body() body: unknown) {
    await this.security.limit(req, "reset", 10);
    const data = parse(resetSchema, body);
    return this.auth.reset(data.token, data.password, req.requestId);
  }
  @Post("invitations/accept") async accept(
    @Req() req: Request,
    @Body() body: unknown,
  ) {
    await this.security.limit(req, "invitation.accept", 20);
    return this.auth.accept(req, parse(invitationAcceptSchema, body));
  }
}
