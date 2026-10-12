import { Inject, Injectable } from "@nestjs/common";
import type { AiCatalog, AiSource } from "@market/contracts";
import {
  AI_PROVIDER,
  type AiCredential,
  type AiProvider,
} from "./ai.provider.js";

@Injectable()
export class AiCatalogService {
  private cache = new Map<string, { value: AiCatalog; expires: number }>();
  constructor(@Inject(AI_PROVIDER) private provider: AiProvider) {}
  async get(source: AiSource, identity: string, credential: AiCredential) {
    for (const [key, entry] of this.cache)
      if (entry.expires <= Date.now()) this.cache.delete(key);
    const key = `${source}:${identity}:${credential.revision}`;
    const cached = this.cache.get(key);
    if (cached && !credential.signal.aborted) return cached.value;
    const models = await this.provider.models(
      credential,
      AbortSignal.timeout(20000),
    );
    const value: AiCatalog = {
      source,
      connectionRevision: credential.revision,
      fetchedAt: new Date().toISOString(),
      models,
    };
    if (this.cache.size >= 256)
      this.cache.delete(this.cache.keys().next().value!);
    this.cache.set(key, {
      value,
      expires: Math.min(Date.now() + 300000, credential.expiresAt),
    });
    return value;
  }
  invalidate(identity: string) {
    for (const key of this.cache.keys())
      if (
        key.startsWith(`temporary:${identity}:`) ||
        (identity === "managed" && key.startsWith("managed:"))
      )
        this.cache.delete(key);
  }
}
