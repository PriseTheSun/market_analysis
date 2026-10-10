import { describe, it, expect, beforeAll } from "vitest";
import { Browser } from "./helpers";
import { randomUUID } from "node:crypto";
const b = new Browser();
let tenant = "";
beforeAll(async () => {
  await b.login("user@marketanalysis.com");
  tenant = (await b.call("/contexts")).data[0].id;
});
describe("SSE through nginx", () => {
  it("streams progressively, persists and replays an operation without new messages", async () => {
    const c = (
      await b.call(`/tenants/${tenant}/conversations`, "POST", {
        title: "Streaming integration",
      })
    ).data;
    const data = {
      operationId: randomUUID(),
      content: "Explique uma comparação objetiva",
      locale: "pt-BR",
    };
    const start = Date.now();
    const r = await b.raw(
      `/tenants/${tenant}/conversations/${c.id}/messages`,
      "POST",
      data,
    );
    expect(r.status).toBe(200);
    expect(r.headers.get("content-type")).toContain("text/event-stream");
    const reader = r.body!.getReader();
    let frames = "",
      chunks = 0,
      first = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks++;
      if (!first) first = Date.now() - start;
      frames += new TextDecoder().decode(value);
    }
    expect(chunks).toBeGreaterThan(10);
    expect(first).toBeLessThan(2000);
    expect(Date.now() - start).toBeGreaterThan(1000);
    expect(frames).toContain("event: done");
    expect(frames).toContain('"status":"completed"');
    const replay = await b.raw(
      `/tenants/${tenant}/conversations/${c.id}/messages`,
      "POST",
      data,
    );
    expect(await replay.text()).toContain('"existing":true');
    const detail = (await b.call(`/tenants/${tenant}/conversations/${c.id}`))
      .data;
    expect(detail.messages).toHaveLength(2);
    expect(detail.operations).toHaveLength(1);
    expect(detail.messages[1].content).toContain(
      "Não consultei dados de mercado",
    );
  });
  it("cancels and stores partial response, rejects competing operation", async () => {
    const c = (await b.call(`/tenants/${tenant}/conversations`, "POST", {}))
      .data;
    const operationId = randomUUID();
    const r = await b.raw(
      `/tenants/${tenant}/conversations/${c.id}/messages`,
      "POST",
      { operationId, content: "Teste cancelamento", locale: "pt-BR" },
    );
    const reader = r.body!.getReader();
    await reader.read();
    const competing = await b.call(
      `/tenants/${tenant}/conversations/${c.id}/messages`,
      "POST",
      { operationId: randomUUID(), content: "Outra mensagem", locale: "pt-BR" },
    );
    expect(competing.data.code).toBe("OPERATION_ACTIVE");
    await new Promise((resolve) => setTimeout(resolve, 250));
    await b.call(
      `/tenants/${tenant}/operations/${operationId}/cancel`,
      "POST",
      {},
    );
    while (!(await reader.read()).done) {
      /* drain SSE */
    }
    const detail = (await b.call(`/tenants/${tenant}/conversations/${c.id}`))
      .data;
    expect(detail.operations[0].status).toBe("cancelled");
    expect(detail.messages[1].content.length).toBeGreaterThan(0);
    expect(detail.messages[1].content.length).toBeLessThan(400);
  });
});
