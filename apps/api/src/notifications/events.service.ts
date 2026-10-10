import { Injectable } from "@nestjs/common";
import type { Tx } from "../database/database.service.js";
import type { Prisma } from "../generated/prisma/client.js";
@Injectable()
export class EventsService {
  async reviewers(tx: Tx, tenantId: string | null): Promise<string[]> {
    const users = await tx.user.findMany({
      where: {
        active: true,
        OR: [
          { platformRole: "GLOBAL" },
          ...(tenantId
            ? [
                {
                  tenants: {
                    some: { tenantId, active: true, role: "ADMIN" as const },
                  },
                },
                {
                  agencies: {
                    some: {
                      active: true,
                      agency: {
                        active: true,
                        tenants: {
                          some: { id: tenantId, status: "active" as const },
                        },
                      },
                    },
                  },
                },
              ]
            : []),
        ],
      },
      select: { id: true },
    });
    return users.map((u) => u.id);
  }
  async notify(
    tx: Tx,
    recipients: string[],
    tenantId: string | null,
    type: string,
    eventKey: string,
    parameters: Prisma.InputJsonValue = {},
    resourceId?: string,
  ) {
    await tx.$queryRaw`SELECT set_config('app.event_write','true',true)`;
    await tx.notification.createMany({
      data: [...new Set(recipients)].map((recipientId) => ({
        recipientId,
        tenantId,
        type,
        eventKey,
        parameters,
        resourceId,
      })),
      skipDuplicates: true,
    });
    await tx.$queryRaw`SELECT set_config('app.event_write','false',true)`;
  }
}
