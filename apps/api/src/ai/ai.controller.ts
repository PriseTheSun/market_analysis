import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  Inject,
  Param,
  Post,
  Put,
  Query,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  aiLocalConnectionInputSchema,
  aiModelTestInputSchema,
  aiSettingsInputSchema,
  aiSourceSchema,
  idSchema,
} from "@market/contracts";
import { SessionGuard } from "../auth/auth.service.js";
import { parse } from "../common/errors.js";
import { AiService } from "./ai.service.js";
import { AiRepository, type AiContext } from "./ai.repository.js";

const context = (req: Request): AiContext => ({
  actor: req.actor!,
  sessionId: req.sessionId!,
  requestId: req.requestId,
});
@Controller("ai")
@UseGuards(SessionGuard)
export class AiController {
  constructor(
    @Inject(AiService) private ai: AiService,
    @Inject(AiRepository) private repository: AiRepository,
  ) {}
  private async authorize(req: Request) {
    await this.repository.assertGlobalSession(context(req));
  }
  @Get("settings")
  @Header("Cache-Control", "no-store")
  async settings(@Req() req: Request) {
    await this.authorize(req);
    return this.ai.settings(context(req));
  }
  @Put("settings")
  @Header("Cache-Control", "no-store")
  async save(@Req() req: Request, @Body() body: unknown) {
    await this.authorize(req);
    return this.ai.save(context(req), parse(aiSettingsInputSchema, body));
  }
  @Get("models")
  @Header("Cache-Control", "no-store")
  async models(@Req() req: Request, @Query("source") source: unknown) {
    await this.authorize(req);
    return this.ai.models(context(req), parse(aiSourceSchema, source));
  }
  @Post("local-connection")
  @Header("Cache-Control", "no-store")
  async connect(@Req() req: Request, @Body() body: unknown) {
    await this.authorize(req);
    return this.ai.connect(
      context(req),
      parse(aiLocalConnectionInputSchema, body).token,
    );
  }
  @Delete("local-connection")
  @Header("Cache-Control", "no-store")
  async revoke(@Req() req: Request) {
    await this.authorize(req);
    return this.ai.revoke(context(req));
  }
  @Post("model-tests")
  @HttpCode(202)
  @Header("Cache-Control", "no-store")
  async test(@Req() req: Request, @Body() body: unknown) {
    await this.authorize(req);
    return this.ai.startTest(context(req), parse(aiModelTestInputSchema, body));
  }
  @Get("model-tests/:id")
  @Header("Cache-Control", "no-store")
  async readTest(@Req() req: Request, @Param("id") id: unknown) {
    await this.authorize(req);
    return this.ai.readTest(context(req), parse(idSchema, id));
  }
  @Delete("model-tests/:id")
  @Header("Cache-Control", "no-store")
  async cancel(@Req() req: Request, @Param("id") id: unknown) {
    await this.authorize(req);
    return this.ai.cancelTest(context(req), parse(idSchema, id));
  }
  @Get("model-tests/:id/image")
  async image(
    @Req() req: Request,
    @Param("id") id: unknown,
    @Res() res: Response,
  ) {
    await this.authorize(req);
    const bytes = await this.ai.image(context(req), parse(idSchema, id));
    res
      .set({
        "Content-Type": "image/png",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      })
      .send(Buffer.from(bytes));
  }
  @Get("usage")
  @Header("Cache-Control", "no-store")
  async usage(@Req() req: Request, @Query("source") source: unknown) {
    await this.authorize(req);
    return this.ai.usage(
      context(req),
      parse(aiSourceSchema.optional(), source),
    );
  }
}
