import { describe, it, expect, vi } from "vitest";
import {
  AuditService,
  activityChanges,
  type ActivitySnapshot,
} from "./audit.service.js";
import type { Tx } from "../database/database.service.js";

describe("safe activity snapshots", () => {
  it("only compares allowlisted fields and never includes credentials", () => {
    const unsafe = {
      name: "Record",
      fields: {
        name: "New",
        password: "secret",
        token: "provider-token",
        sessionId: "private-session",
        content: "private-message",
      },
    };
    const changes = activityChanges(
      { name: "Record", fields: { name: "Old" } },
      unsafe as ActivitySnapshot,
    );
    expect(changes).toEqual([{ field: "name", before: "Old", after: "New" }]);
    expect(activityChanges(undefined, unsafe as ActivitySnapshot)).toEqual([]);
  });
  it("queries only model selections for AI snapshots and never publishes session identifiers", async () => {
    const tx = {
      aiConfiguration: {
        findUnique: vi
          .fn()
          .mockResolvedValue({
            source: "temporary",
            chatText: "model-a",
            imageGeneration: null,
          }),
      },
      user: { findUnique: vi.fn().mockResolvedValue({ name: "Global" }) },
      auditLog: { create: vi.fn().mockImplementation((x) => x.data) },
    };
    const event = await new AuditService().record(
      tx as unknown as Tx,
      { id: "actor-id", platformRole: "GLOBAL" },
      "ai.settings.saved",
      "request-id",
      {
        resourceId: "local:private-session",
        before: {
          name: null,
          fields: {
            source: "managed",
            chatText: "model-b",
            imageGeneration: null,
          },
        },
      },
    );
    expect(tx.aiConfiguration.findUnique).toHaveBeenCalledWith({
      where: { key: "local:private-session" },
      select: { source: true, chatText: true, imageGeneration: true },
    });
    expect(JSON.stringify(event.display)).not.toContain("private-session");
    expect(event.display).toMatchObject({
      changes: [
        { field: "source", before: "managed", after: "temporary" },
        { field: "chatText", before: "model-b", after: "model-a" },
      ],
    });
  });
  it("does not read conversation content when recording its creation", async () => {
    const tx = {
      user: { findUnique: vi.fn().mockResolvedValue({ name: "User" }) },
      tenant: {
        findUnique: vi
          .fn()
          .mockResolvedValue({ name: "Client", agencyId: "agency" }),
      },
      agency: { findUnique: vi.fn().mockResolvedValue({ name: "Agency" }) },
      conversation: { findUnique: vi.fn() },
      auditLog: { create: vi.fn().mockImplementation((x) => x.data) },
    };
    const event = await new AuditService().record(
      tx as unknown as Tx,
      { id: "actor", platformRole: null },
      "conversation.created",
      "request",
      { resourceId: "conversation", tenantId: "client" },
    );
    expect(tx.conversation.findUnique).not.toHaveBeenCalled();
    expect(event.display).toMatchObject({
      resourceName: null,
      changes: [],
      detailsRecorded: true,
    });
  });
});
