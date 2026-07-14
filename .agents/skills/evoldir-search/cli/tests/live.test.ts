import { describe, test, expect } from "bun:test";
import { runCLI, parseJSON } from "./helpers";

// Live smoke test against the real EvolDir index page. Keep this file's
// request count low (one search, one detail) — this is a personal academic
// server, not a load-test target.
describe("evoldir CLI (live)", () => {
  test("search -q genomics returns real, non-empty results", async () => {
    const result = await runCLI(["search", "-q", "genomics", "--limit", "5"]);
    const parsed = parseJSON<{ meta: { count: number }; results: Array<Record<string, unknown>> }>(result);
    expect(parsed.results.length).toBeGreaterThan(0);
    for (const posting of parsed.results) {
      expect(typeof posting.id).toBe("string");
      expect((posting.id as string).length).toBeGreaterThan(0);
      expect(typeof posting.title).toBe("string");
      expect(typeof posting.url).toBe("string");
      expect(posting.url as string).toMatch(/^https:\/\/evol\.mcmaster\.ca\//);
    }
  });

  test("detail on the first search result returns readable description text", async () => {
    const searchResult = await runCLI(["search", "-q", "genomics", "--limit", "1"]);
    const parsed = parseJSON<{ results: Array<{ id: string }> }>(searchResult);
    expect(parsed.results.length).toBeGreaterThan(0);
    const id = parsed.results[0].id;

    const detailResult = await runCLI(["detail", id]);
    expect(detailResult.exitCode).toBe(0);
    const detail = parseJSON<{ description: string | null }>(detailResult);
    expect(detail.description).not.toBeNull();
    expect((detail.description as string).length).toBeGreaterThan(20);
  });
});
