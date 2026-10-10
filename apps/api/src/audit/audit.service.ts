import { Injectable } from "@nestjs/common";
import type { Tx } from "../database/database.service.js";
import type { Actor } from "../authorization/policy.js";
@Injectable()
export class AuditService {
  record(
    tx: Tx,
    actor: Actor | null,
    action: string,
    requestId: string,
    details: {
      tenantId?: string;
      agencyId?: string;
      resourceId?: string;
      reason?: string;
      result?: string;
    } = {},
  ) {
    return tx.auditLog.create({
      data: {
        actorId: actor?.id,
        action,
        requestId,
        ...details,
        result: details.result ?? "success",
      },
    });
  }
}
