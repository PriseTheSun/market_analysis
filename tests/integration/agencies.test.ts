import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { Browser } from "./helpers";

const owner = new pg.Pool({
  connectionString: process.env.MIGRATION_DATABASE_URL,
});
const global = new Browser();
const user = new Browser();
const suffix = randomUUID().slice(0, 8);
const prefix = `agency-filter-${suffix}`;
const fixtures = [
  {
    id: randomUUID(),
    name: `Filter ${suffix} A`,
    slug: `${prefix}-a`,
    active: true,
  },
  {
    id: randomUUID(),
    name: `Filter ${suffix} A`,
    slug: `${prefix}-b`,
    active: true,
  },
  {
    id: randomUUID(),
    name: `Filter ${suffix} B`,
    slug: `${prefix}-c`,
    active: false,
  },
];

beforeAll(async () => {
  for (const fixture of fixtures) {
    await owner.query(
      'INSERT INTO "Agency" (id,name,slug,active,"updatedAt") VALUES ($1,$2,$3,$4,now())',
      [fixture.id, fixture.name, fixture.slug, fixture.active],
    );
  }
  expect((await global.login("global@marketanalysis.com")).status).toBe(200);
  expect((await user.login("user@marketanalysis.com")).status).toBe(200);
});

afterAll(async () => {
  await owner.query('DELETE FROM "Agency" WHERE id=ANY($1::uuid[])', [
    fixtures.map((fixture) => fixture.id),
  ]);
  await owner.end();
});

describe("agency search and status filters", () => {
  it("finds an agency by its identifier without requiring a matching name", async () => {
    const result = await global.call(
      `/platform/agencies?search=${fixtures[0]!.slug.toUpperCase()}`,
    );
    expect(result.status).toBe(200);
    expect(result.data.total).toBe(1);
    expect(result.data.items).toEqual([expect.objectContaining(fixtures[0]!)]);
  });

  it("combines status and search, including the total used by pagination", async () => {
    for (const [status, active, total] of [
      ["active", true, 2],
      ["inactive", false, 1],
    ] as const) {
      const result = await global.call(
        `/platform/agencies?search=${prefix}&status=${status}&pageSize=1`,
      );
      expect(result.status).toBe(200);
      expect(result.data.total).toBe(total);
      expect(result.data.items).toHaveLength(1);
      expect(result.data.items[0].active).toBe(active);
    }
    const empty = await global.call(
      `/platform/agencies?search=${fixtures[0]!.slug}&status=inactive`,
    );
    expect(empty.data).toMatchObject({ items: [], total: 0 });
  });

  it("keeps identically named agencies on distinct, stable pages", async () => {
    const ids: string[] = [];
    for (let page = 1; page <= fixtures.length; page++) {
      const result = await global.call(
        `/platform/agencies?search=${prefix}&pageSize=1&page=${page}`,
      );
      expect(result.status).toBe(200);
      expect(result.data.total).toBe(3);
      expect(result.data.items).toHaveLength(1);
      ids.push(result.data.items[0].id);
    }
    const expected = [...fixtures]
      .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id))
      .map((fixture) => fixture.id);
    expect(ids).toEqual(expected);
  });

  it("validates the status and preserves platform access restrictions", async () => {
    expect(
      (await global.call("/platform/agencies?status=unknown")).status,
    ).toBe(400);
    expect((await user.call("/platform/agencies?status=inactive")).status).toBe(
      403,
    );
  });
});
