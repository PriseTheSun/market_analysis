import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module.js";
import { AiController } from "./ai.controller.js";
import { AiRepository } from "./ai.repository.js";
import { AiService } from "./ai.service.js";
import { AiCatalogService } from "./ai-catalog.js";
import { AI_PROVIDER } from "./ai.provider.js";
import { GeminiProvider, aiFetchProvider } from "./gemini.provider.js";
import {
  ManagedConnection,
  secretClientProvider,
} from "./managed-connection.js";

@Module({
  imports: [AuthModule],
  controllers: [AiController],
  providers: [
    AiRepository,
    AiService,
    AiCatalogService,
    aiFetchProvider,
    secretClientProvider,
    ManagedConnection,
    { provide: AI_PROVIDER, useClass: GeminiProvider },
  ],
  exports: [AI_PROVIDER, ManagedConnection, AiService],
})
export class AiModule {}
