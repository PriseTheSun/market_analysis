import {
  Body,
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { Request } from "express";
import {
  idSchema,
  managementKindSchema,
  managementListSchema,
  managementUserSchema,
  managementAgencySchema,
  managementClientSchema,
  permissionSchema,
  permissionIdSchema,
} from "@market/contracts";
import { parse } from "../common/errors.js";
import { SessionGuard } from "../auth/auth.service.js";
import { ManagementService } from "./management.service.js";
@Controller("platform/management")
@UseGuards(SessionGuard)
export class ManagementController {
  constructor(@Inject(ManagementService) private service: ManagementService) {}
  @Get("options") options(@Req() r: Request) {
    return this.service.options(r.actor!);
  }
  @Get(":kind") list(
    @Req() r: Request,
    @Param("kind") kind: string,
    @Query() q: unknown,
  ) {
    return this.service.list(
      r.actor!,
      parse(managementKindSchema, kind),
      parse(managementListSchema, q),
    );
  }
  @Post("users") createUser(@Req() r: Request, @Body() b: unknown) {
    return this.service.saveUser(
      r.actor!,
      undefined,
      parse(managementUserSchema, b),
      r.requestId,
    );
  }
  @Patch("users/:id") updateUser(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.saveUser(
      r.actor!,
      parse(idSchema, id),
      parse(managementUserSchema, b),
      r.requestId,
    );
  }
  @Post("agencies") createAgency(@Req() r: Request, @Body() b: unknown) {
    return this.service.saveAgency(
      r.actor!,
      undefined,
      parse(managementAgencySchema, b),
      r.requestId,
    );
  }
  @Patch("agencies/:id") updateAgency(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.saveAgency(
      r.actor!,
      parse(idSchema, id),
      parse(managementAgencySchema, b),
      r.requestId,
    );
  }
  @Post("clients") createClient(@Req() r: Request, @Body() b: unknown) {
    return this.service.saveClient(
      r.actor!,
      undefined,
      parse(managementClientSchema, b),
      r.requestId,
    );
  }
  @Patch("clients/:id") updateClient(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.saveClient(
      r.actor!,
      parse(idSchema, id),
      parse(managementClientSchema, b),
      r.requestId,
    );
  }
  @Post("permissions") createPermission(@Req() r: Request, @Body() b: unknown) {
    return this.service.savePermission(
      r.actor!,
      undefined,
      parse(permissionSchema, b),
      r.requestId,
    );
  }
  @Patch("permissions/:id") updatePermission(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.savePermission(
      r.actor!,
      parse(permissionIdSchema, id),
      parse(permissionSchema, b),
      r.requestId,
    );
  }
  @Delete("permissions/:id") removePermission(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    return this.service.removePermission(
      r.actor!,
      parse(permissionIdSchema, id),
      r.requestId,
    );
  }
  @Delete(":kind/:id") archive(
    @Req() r: Request,
    @Param("kind") kind: string,
    @Param("id") id: string,
  ) {
    return this.service.archive(
      r.actor!,
      parse(managementKindSchema.exclude(["permissions"]), kind),
      parse(idSchema, id),
      false,
      r.requestId,
    );
  }
  @Post(":kind/:id/restore") restore(
    @Req() r: Request,
    @Param("kind") kind: string,
    @Param("id") id: string,
  ) {
    return this.service.archive(
      r.actor!,
      parse(managementKindSchema.exclude(["permissions"]), kind),
      parse(idSchema, id),
      true,
      r.requestId,
    );
  }
}
