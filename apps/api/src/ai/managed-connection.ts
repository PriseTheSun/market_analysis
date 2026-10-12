import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager";
import { aiLocalConnectionInputSchema } from "@market/contracts";
import { CONFIG, type Config } from "../common/config.js";
import { AppError } from "../common/errors.js";
import type { AiCredential } from "./ai.provider.js";

export const AI_SECRET_CLIENT = Symbol("AI_SECRET_CLIENT");
export type SecretReader = Pick<SecretsManagerClient, "send" | "destroy">;
export const secretClientProvider = {
  provide: AI_SECRET_CLIENT,
  inject: [CONFIG],
  useFactory: (config: Config) =>
    new SecretsManagerClient({
      region: config.AI_GEMINI_SECRET_REGION || "us-east-1",
      maxAttempts: 1,
    }),
};
@Injectable()
export class ManagedConnection implements OnModuleDestroy {
  private cached?: AiCredential;
  private loading?: Promise<AiCredential>;
  private controls = new Set<AbortController>();
  constructor(
    @Inject(CONFIG) private config: Config,
    @Inject(AI_SECRET_CLIENT) private client: SecretReader,
  ) {}
  get configured() {
    return (
      this.config.AI_GEMINI_ENABLED === "true" &&
      !!this.config.AI_GEMINI_SECRET_ID &&
      !!this.config.AI_GEMINI_SECRET_REGION
    );
  }
  async resolve(): Promise<AiCredential> {
    if (!this.configured) throw new AppError(503, "AI_NOT_CONFIGURED");
    if (this.cached && this.cached.expiresAt > Date.now()) return this.cached;
    this.cached = undefined;
    if (!this.loading)
      this.loading = this.read().finally(() => {
        this.loading = undefined;
      });
    return this.loading;
  }
  invalidate() {
    this.cached = undefined;
  }
  private async read(): Promise<AiCredential> {
    try {
      const result = await this.client.send(
        new GetSecretValueCommand({
          SecretId: this.config.AI_GEMINI_SECRET_ID,
        }),
        {
          abortSignal: AbortSignal.timeout(10000),
        },
      );
      if (
        !result.SecretString ||
        result.SecretString.length > 65536 ||
        !result.VersionId ||
        !/^[\w-]{1,128}$/.test(result.VersionId)
      )
        throw new Error();
      const object: unknown = JSON.parse(result.SecretString);
      if (!object || typeof object !== "object" || Array.isArray(object))
        throw new Error();
      const value = (object as Record<string, unknown>)[
        this.config.AI_GEMINI_SECRET_KEY_FIELD
      ];
      const parsed = aiLocalConnectionInputSchema.safeParse({
        provider: "gemini",
        token: value,
      });
      if (!parsed.success) throw new Error();
      const control = new AbortController();
      this.controls.add(control);
      const expiry = Date.now() + 300000;
      const timer = setTimeout(() => {
        control.abort();
        this.controls.delete(control);
      }, 300000);
      timer.unref();
      this.cached = {
        key: parsed.data.token,
        revision: `aws:${result.VersionId}`,
        expiresAt: expiry,
        signal: control.signal,
      };
      return this.cached;
    } catch {
      throw new AppError(503, "AI_PROVIDER_UNAVAILABLE");
    }
  }
  onModuleDestroy() {
    for (const control of this.controls) control.abort();
    this.controls.clear();
    this.cached = undefined;
    this.client.destroy();
  }
}
