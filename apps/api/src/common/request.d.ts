import type { Actor } from "../authorization/policy.js";
declare global {
  namespace Express {
    interface Request {
      requestId: string;
      actor?: Actor;
      sessionId?: string;
    }
  }
}
