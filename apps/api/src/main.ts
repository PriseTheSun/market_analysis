import "reflect-metadata";
import { Controller, Get, Inject, Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { json } from "express";
import helmet from "helmet";
import { CoreModule } from "./common/core.module.js";
import { CONFIG, type Config } from "./common/config.js";
import { SecurityService } from "./common/security.service.js";
import { ErrorFilter } from "./common/errors.js";
import { DatabaseService } from "./database/database.service.js";
import { AuthModule } from "./auth/auth.module.js";
import { AdministrationModule } from "./administration/administration.controller.js";
import { AccessRequestsModule } from "./access-requests/access-requests.controller.js";
import { ChatModule } from "./chat/chat.controller.js";
import { FilesModule } from "./files/files.controller.js";
import { PersonalModule } from "./personal/personal.controller.js";
import { AiModule } from "./ai/ai.module.js";
@Controller("health")
class HealthController {
  constructor(@Inject(DatabaseService) private db: DatabaseService) {}
  @Get() async health() {
    await this.db.metadata.$queryRaw`SELECT 1`;
    return { status: "ok" };
  }
}
@Module({
  imports: [
    CoreModule,
    AuthModule,
    AdministrationModule,
    AccessRequestsModule,
    PersonalModule,
    FilesModule,
    ChatModule,
    AiModule,
  ],
  controllers: [HealthController],
})
class AppModule {}
const app = await NestFactory.create(AppModule, {
  logger: ["error", "warn"],
  rawBody: false,
  bodyParser: false,
});
const config = app.get<Config>(CONFIG);
app.setGlobalPrefix("api/v1");
app.getHttpAdapter().getInstance().set("trust proxy", 1);
app.use(helmet(), cookieParser());
app.use(app.get(SecurityService).use.bind(app.get(SecurityService)));
// Chat text is bounded by the selected provider, not the default JSON body cap.
app.use(
  "/api/v1/tenants/:tenantId/conversations/:id/messages",
  json({ limit: Infinity }),
);
app.use(json());
app.enableCors({
  origin: config.ALLOWED_ORIGINS.split(","),
  credentials: true,
  allowedHeaders: ["Content-Type", "X-CSRF-Token"],
  exposedHeaders: ["X-Request-Id"],
});
app.useGlobalFilters(new ErrorFilter());
app.enableShutdownHooks();
if (config.NODE_ENV !== "production")
  SwaggerModule.setup(
    "api/docs",
    app,
    SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle("Market Analysis")
        .setVersion("1")
        .addCookieAuth("ma_session")
        .build(),
    ),
  );
try {
  await app.listen(
    config.PORT,
    config.BIND_HOST ?? (config.APP_ENV === "local" ? "127.0.0.1" : "0.0.0.0"),
  );
} catch {
  console.error(JSON.stringify({ event: "api.start.failed" }));
  await app.close();
  process.exit(1);
}
console.log(JSON.stringify({ event: "api.ready", port: config.PORT }));
