import {
  Body,
  Controller,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Request, Response } from "express";
import {
  idSchema,
  conversationSchema,
  messageSchema,
  auditReadSchema,
} from "@market/contracts";
import { parse } from "../common/errors.js";
import { SessionGuard } from "../auth/auth.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { ChatService } from "./chat.service.js";
import { AiModule } from "../ai/ai.module.js";
@Controller()
@UseGuards(SessionGuard)
export class ChatController {
  constructor(@Inject(ChatService) private chat: ChatService) {}
  @Get("tenants/:tenantId/conversations") list(
    @Req() r: Request,
    @Param("tenantId") t: string,
  ) {
    return this.chat.list(
      r.actor!,
      parse(idSchema, t),
      r.requestId,
      r.sessionId!,
    );
  }
  @Post("tenants/:tenantId/conversations") create(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Body() b: unknown,
  ) {
    return this.chat.create(
      r.actor!,
      parse(idSchema, t),
      parse(conversationSchema, b).title,
      r.requestId,
    );
  }
  @Get("tenants/:tenantId/conversations/:id") read(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
  ) {
    return this.chat.read(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      r.requestId,
    );
  }
  @Post("tenants/:tenantId/conversations/:id/messages") async message(
    @Req() r: Request,
    @Res() response: Response,
    @Param("tenantId") t: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    await this.chat.stream(
      r,
      response,
      parse(idSchema, t),
      parse(idSchema, id),
      parse(messageSchema, b),
    );
  }
  @Post("tenants/:tenantId/operations/:id/cancel") cancel(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
  ) {
    return this.chat.cancel(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      r.requestId,
    );
  }
  @Post("platform/tenants/:tenantId/conversations/audit") auditList(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Body() b: unknown,
  ) {
    return this.chat.auditList(
      r.actor!,
      parse(idSchema, t),
      parse(auditReadSchema, b).reason,
      r.requestId,
    );
  }
  @Post("platform/tenants/:tenantId/conversations/:id/audit") auditRead(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.chat.auditRead(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      parse(auditReadSchema, b).reason,
      r.requestId,
    );
  }
}
@Module({
  imports: [AuthModule, AiModule],
  controllers: [ChatController],
  providers: [ChatService],
})
export class ChatModule {}
