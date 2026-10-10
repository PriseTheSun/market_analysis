import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
  Module,
} from "@nestjs/common";
import type { Request } from "express";
import {
  paginationSchema,
  idSchema,
  agencySchema,
  agencyListSchema,
  agencyUpdateSchema,
  tenantCreateSchema,
  tenantUpdateSchema,
  agencyMembershipSchema,
  platformRoleSchema,
  accountStatusSchema,
  membershipSchema,
  invitationSchema,
} from "@market/contracts";
import { parse } from "../common/errors.js";
import { SessionGuard } from "../auth/auth.service.js";
import { AuthModule } from "../auth/auth.module.js";
import { AdministrationService } from "./administration.service.js";
import { SecurityService } from "../common/security.service.js";
@Controller()
@UseGuards(SessionGuard)
export class AdministrationController {
  constructor(
    @Inject(AdministrationService) private service: AdministrationService,
    @Inject(SecurityService) private security: SecurityService,
  ) {}
  @Get("contexts") contexts(@Req() r: Request) {
    return this.service.contexts(r.actor!);
  }
  @Get("agencies") agencies(@Req() r: Request, @Query() q: unknown) {
    return this.service.agencies(r.actor!, parse(paginationSchema, q));
  }
  @Get("platform/agencies") allAgencies(
    @Req() r: Request,
    @Query() q: unknown,
  ) {
    return this.service.agencies(r.actor!, parse(agencyListSchema, q), true);
  }
  @Post("platform/agencies") createAgency(
    @Req() r: Request,
    @Body() b: unknown,
  ) {
    return this.service.createAgency(
      r.actor!,
      parse(agencySchema, b),
      r.requestId,
    );
  }
  @Patch("platform/agencies/:id") updateAgency(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.updateAgency(
      r.actor!,
      parse(idSchema, id),
      parse(agencyUpdateSchema, b),
      r.requestId,
    );
  }
  @Get("platform/tenants") tenants(@Req() r: Request, @Query() q: unknown) {
    return this.service.tenants(r.actor!, parse(paginationSchema, q));
  }
  @Get("agencies/:id/tenants") agencyTenants(
    @Req() r: Request,
    @Param("id") id: string,
    @Query() q: unknown,
  ) {
    return this.service.tenants(
      r.actor!,
      parse(paginationSchema, q),
      parse(idSchema, id),
    );
  }
  @Post("platform/tenants") createTenant(
    @Req() r: Request,
    @Body() b: unknown,
  ) {
    return this.service.createTenant(
      r.actor!,
      parse(tenantCreateSchema, b),
      r.requestId,
    );
  }
  @Patch("platform/tenants/:id") updateTenant(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.updateTenant(
      r.actor!,
      parse(idSchema, id),
      parse(tenantUpdateSchema, b),
      r.requestId,
    );
  }
  @Get("platform/agencies/:id/super-admins") agencyMembers(
    @Req() r: Request,
    @Param("id") id: string,
  ) {
    return this.service.listAgencyMembers(r.actor!, parse(idSchema, id));
  }
  @Post("platform/agencies/:id/super-admins") updateAgencyMembers(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.agencyMembers(
      r.actor!,
      parse(idSchema, id),
      parse(agencyMembershipSchema, b),
      r.requestId,
    );
  }
  @Get("platform/users") users(@Req() r: Request, @Query() q: unknown) {
    return this.service.users(r.actor!, parse(paginationSchema, q));
  }
  @Post("platform/users/:id/global-role") globalRole(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.updateIdentity(
      r.actor!,
      parse(idSchema, id),
      parse(platformRoleSchema, b),
      r.requestId,
    );
  }
  @Post("platform/users/:id/status") accountStatus(
    @Req() r: Request,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.updateIdentity(
      r.actor!,
      parse(idSchema, id),
      parse(accountStatusSchema, b),
      r.requestId,
    );
  }
  @Get("tenants/:tenantId/members") members(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Query() q: unknown,
  ) {
    return this.service.members(
      r.actor!,
      parse(idSchema, t),
      parse(paginationSchema, q),
      r.requestId,
    );
  }
  @Patch("tenants/:tenantId/members/:id") updateMember(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.service.updateMember(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      parse(membershipSchema, b),
      r.requestId,
    );
  }
  @Get("tenants/:tenantId/invitations") invitations(
    @Req() r: Request,
    @Param("tenantId") t: string,
  ) {
    return this.service.invitations(r.actor!, parse(idSchema, t), r.requestId);
  }
  @Post("tenants/:tenantId/invitations") async invite(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Body() b: unknown,
  ) {
    await this.security.limit(r, "invite", 20);
    return this.service.invite(
      r.actor!,
      parse(idSchema, t),
      parse(invitationSchema, b),
      r.requestId,
    );
  }
  @Post("tenants/:tenantId/invitations/:id/resend") async resend(
    @Req() r: Request,
    @Param("tenantId") t: string,
    @Param("id") id: string,
  ) {
    await this.security.limit(r, "invite.resend", 10);
    return this.service.resend(
      r.actor!,
      parse(idSchema, t),
      parse(idSchema, id),
      r.requestId,
    );
  }
}
@Module({
  imports: [AuthModule],
  controllers: [AdministrationController],
  providers: [AdministrationService],
  exports: [AdministrationService],
})
export class AdministrationModule {}
