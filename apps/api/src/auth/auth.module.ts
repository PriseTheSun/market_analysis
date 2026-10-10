import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller.js";
import { AuthService, SessionGuard } from "./auth.service.js";
@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
