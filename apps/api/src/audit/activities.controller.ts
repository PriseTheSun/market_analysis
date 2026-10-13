import {
  Controller,
  Get,
  Inject,
  Module,
  Query,
  Req,
  UseGuards,
  Header,
} from "@nestjs/common";
import type { Request } from "express";
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
}
@Module({
  imports: [AuthModule],
  controllers: [ActivitiesController],
  providers: [ActivitiesService],
})
export class ActivitiesModule {}
