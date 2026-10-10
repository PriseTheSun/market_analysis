import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Module,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import { idSchema, paginationSchema, uploadSchema } from "@market/contracts";
import { parse } from "../common/errors.js";
import { SessionGuard } from "../auth/auth.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { SecurityService } from "../common/security.service.js";
import { FilesService } from "./files.service.js";
@Controller("tenants/:tenantId/files")
@UseGuards(SessionGuard)
export class FilesController {
  constructor(
    @Inject(FilesService) private files: FilesService,
    @Inject(SecurityService) private security: SecurityService,
  ) {}
  @Get() list(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Query() q: unknown,
  ) {
    return this.files.list(
      r.actor!,
      parse(idSchema, t),
      parse(paginationSchema, q),
      r.requestId,
    );
  }
  @Post() async reserve(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Body() b: unknown,
  ) {
    await this.security.limit(r, "upload", 30);
    return this.files.reserve(
      r.actor!,
      parse(idSchema, t),
      parse(uploadSchema, b),
      r.requestId,
    );
  }
  @Post(":id/finalize") finalize(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
  ) {
    return this.files.finalize(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      r.requestId,
    );
  }
  @Post(":id/download") download(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
  ) {
    return this.files.download(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      r.requestId,
    );
  }
  @Delete(":id") remove(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
  ) {
    return this.files.remove(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      r.requestId,
    );
  }
}
@Module({
  imports: [AuthModule],
  controllers: [FilesController],
  providers: [FilesService],
})
export class FilesModule {}
