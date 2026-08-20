import { describe, test, expect } from "bun:test";
import { runCLI } from "./helpers";

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

describe("workday CLI flag validation", () => {
  describe("company resolution", () => {
    test("search with no --company/--tenant exits 1 with NO_COMPANY", async () => {
      const result = await runCLI(["search", "-q", "genomics"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("NO_COMPANY");
    });

    test("detail with no --company/--tenant exits 1 with NO_COMPANY", async () => {
      const result = await runCLI(["detail", "/job/x"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("NO_COMPANY");
    });

    test("an unknown --company key resolves to null and still reports NO_COMPANY", async () => {
      const result = await runCLI(["search", "--company", "not-a-real-company", "-q", "x"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("NO_COMPANY");
    });

    test("raw --tenant/--wd/--site together resolve without a registry key (network call follows, but no NO_COMPANY)", async () => {
      // This will attempt a real network call and likely fail on a bogus tenant,
      // but the assertion here is only that company resolution itself succeeded
      // (i.e. we get past NO_COMPANY into SEARCH_FAILED territory instead).
      const result = await runCLI(["search", "--tenant", "doesnotexist12345", "--wd", "wd1", "--site", "x", "-q", "y"]);
      expect(parsedStderr(result.stderr).code).not.toBe("NO_COMPANY");
    }, 15000);
  });

  describe("numeric flag validation", () => {
    for (const name of ["page", "limit"]) {
      test(`--${name} non-numeric exits 1 with BAD_ARG`, async () => {
        const result = await runCLI(["search", "--company", "illumina", `--${name}`, "foo"]);
        expect(result.exitCode).not.toBe(0);
        const err = parsedStderr(result.stderr);
        expect(err.code).toBe("BAD_ARG");
        expect(err.error).toMatch(new RegExp(name));
      });
    }
  });

  describe("detail argument validation", () => {
    test("missing id exits 1 with NO_ID", async () => {
      const result = await runCLI(["detail", "--company", "illumina"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("NO_ID");
    });

    test("an unparseable id exits 1 with BAD_ID (no network)", async () => {
      const result = await runCLI(["detail", "--company", "illumina", "not a path"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("BAD_ID");
    });
  });

  describe("command dispatch", () => {
    test("unknown command exits 1 with BAD_CMD", async () => {
      const result = await runCLI(["frobnicate"]);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("BAD_CMD");
    });

    test("no command prints help and exits 1", async () => {
      const result = await runCLI([]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(/USAGE/);
    });

    test("companies command lists the registry as JSON by default", async () => {
      const result = await runCLI(["companies"]);
      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(result.stdout);
      expect(parsed.illumina).toMatchObject({ tenant: "illumina" });
    });

    test("companies --format table renders a table", async () => {
      const result = await runCLI(["companies", "--format", "table"]);
      expect(result.exitCode).toBe(0);
      expect(result.stdout).toMatch(/KEY/);
      expect(result.stdout).toMatch(/illumina/);
    });
  });
});
