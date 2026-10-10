import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  HttpCode,
  Module,
} from "@nestjs/common";
import type { Request } from "express";
import {
  accessRequestSchema,
  classifySchema,
  reviewSchema,
  requestListSchema,
  idSchema,
} from "@market/contracts";
import { parse } from "../common/errors.js";
import { SecurityService } from "../common/security.service.js";
import { SessionGuard } from "../auth/auth.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { AccessRequestsService } from "./access-requests.service.js";
@Controller()
export class AccessRequestsController {
  constructor(
    @Inject(AccessRequestsService) private service: AccessRequestsService,
    @Inject(SecurityService) private security: SecurityService,
  ) {}
  @Post("access-requests") @HttpCode(202) async submit(
    @Req() r: Request,
    @Body() b: unknown,
  ) {
    await this.security.limit(r, "access.submit", 10);
    return this.service.submit(parse(accessRequestSchema, b));
  }
  @Get("platform/access-requests") @UseGuards(SessionGuard) list(
    @Req() r: Request,
    @Query() q: unknown,
  ) {
    return this.service.list(
      r.actor!,
      parse(requestListSchema, q),
      r.requestId,
    );
  }
  @Post("platform/access-requests/:id/classify")
  @UseGuards(SessionGuard)
  classify(@Req() r: Request, @Param("id") id: string, @Body() b: unknown) {
    return this.service.classify(
      r.actor!,
      parse(idSchema, id),
      parse(classifySchema, b).tenantId,
      r.requestId,
    );
  }
  @Post("platform/access-requests/:id/review") @UseGuards(SessionGuard) review(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.review(
      r.actor!,
      parse(idSchema, id),
      parse(reviewSchema, b),
      r.requestId,
    );
  }
  @Get("tenants/:tenantId/access-requests") @UseGuards(SessionGuard) tenantList(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Query() q: unknown,
  ) {
    return this.service.list(
      r.actor!,
      parse(requestListSchema, q),
      r.requestId,
      parse(idSchema, t),
    );
  }
  @Post("tenants/:tenantId/access-requests/:id/review")
  @UseGuards(SessionGuard)
  tenantReview(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.review(
      r.actor!,
      parse(idSchema, id),
      parse(reviewSchema, b),
      r.requestId,
      parse(idSchema, t),
    );
  }
}
@Module({
  imports: [AuthModule],
  controllers: [AccessRequestsController],
  providers: [AccessRequestsService],
})
export class AccessRequestsModule {}
