import { Global, Module } from "@nestjs/common";
import { CONFIG, loadConfig } from "./config.js";
import { DatabaseService } from "../database/database.service.js";
import { SecurityService } from "./security.service.js";
import { AuditService } from "../audit/audit.service.js";
import { EventsService } from "../notifications/events.service.js";
import { MailService } from "../mail/mail.service.js";
@Global()
@Module({
  providers: [
    { provide: CONFIG, useFactory: loadConfig },
    DatabaseService,
    SecurityService,
    AuditService,
    EventsService,
    MailService,
  ],
  exports: [
    CONFIG,
    DatabaseService,
    SecurityService,
    AuditService,
    EventsService,
    MailService,
  ],
})
export class CoreModule {}
