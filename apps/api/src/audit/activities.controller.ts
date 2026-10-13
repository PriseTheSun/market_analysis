import {
  Controller,
  Get,
  Inject,
  Module,
  Query,
  Req,
  UseGuards,
  Header,
  Param,
  Res,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { z } from "zod";
import { activityQuerySchema } from "@market/contracts";
import { AuthModule } from "../auth/auth.module.js";
import { SessionGuard } from "../auth/auth.service.js";
import { parse } from "../common/errors.js";
import { ActivitiesService } from "./activities.service.js";
@Controller("activities")
@UseGuards(SessionGuard)
class ActivitiesController {
  constructor(@Inject(ActivitiesService) private service: ActivitiesService) {}
  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@Req() r: Request, @Query() q: unknown) {
    return this.service.list(
      r.actor!,
      parse(activityQuerySchema, q),
      r.requestId,
    );
  }
  @Get(":activityId/avatar")
  async avatar(
    @Req() r: Request,
    @Param("activityId") activityId: string,
    @Query() q: unknown,
    @Res() res: Response,
  ) {
    res.setHeader("Cache-Control", "private, no-store");
    const image = await this.service.avatar(
      r.actor!,
      parse(z.uuid(), activityId),
      parse(activityQuerySchema, q),
      r.requestId,
    );
    res.type("image/webp").send(image);
  }
}
@Module({
  imports: [AuthModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
