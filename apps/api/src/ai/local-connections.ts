import { randomUUID } from "node:crypto";
import { AppError } from "../common/errors.js";
import type { AiCredential } from "./ai.provider.js";

export class LocalConnections {
  private entries = new Map<
    string,
    {
      actorId: string;
      credential: AiCredential;
      control: AbortController;
      timer: NodeJS.Timeout;
    }
  >();
  activate(sessionId: string, actorId: string, key: string) {
    this.revoke(sessionId);
    const control = new AbortController();
    const credential: AiCredential = {
      key,
      revision: randomUUID(),
      expiresAt: Date.now() + 3600000,
      signal: control.signal,
    };
    const timer = setTimeout(() => this.revoke(sessionId), 3600000);
    timer.unref();
    this.entries.set(sessionId, { actorId, credential, control, timer });
    return credential;
  }
  get(sessionId: string, actorId: string): AiCredential {
    const entry = this.entries.get(sessionId);
    if (
      !entry ||
      entry.actorId !== actorId ||
      entry.credential.expiresAt <= Date.now()
    ) {
      if (
        entry?.credential.expiresAt &&
        entry.credential.expiresAt <= Date.now()
      )
        this.revoke(sessionId);
      throw new AppError(409, "AI_CONNECTION_EXPIRED");
    }
    return entry.credential;
  }
  sessions() {
    return [...this.entries].map(([sessionId, e]) => ({
      sessionId,
      actorId: e.actorId,
    }));
  }
  revoke(sessionId: string) {
    const entry = this.entries.get(sessionId);
    if (!entry) return;
    entry.control.abort();
    clearTimeout(entry.timer);
    this.entries.delete(sessionId);
  }
  clear() {
    for (const id of this.entries.keys()) this.revoke(id);
  }
}
