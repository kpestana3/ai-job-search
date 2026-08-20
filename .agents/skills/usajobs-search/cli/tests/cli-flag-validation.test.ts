import { describe, test, expect } from "bun:test";
import { runCLI } from "./helpers";

// These assert on validation error codes that are emitted BEFORE any network
// call, so the suite is network-free (and needs no real API key).

function parsedStderr(stderr: string): { error?: string; code?: string } {
  try {
    return JSON.parse(stderr);
  } catch {
    return {};
  }
}

// Force the missing-credentials path regardless of the ambient shell env —
// empty strings override any real key that might be exported locally.
const NO_CREDS = { USAJOBS_API_KEY: "", USAJOBS_USER_AGENT: "" };

describe("usajobs CLI flag validation", () => {
  describe("numeric flag validation", () => {
    for (const name of ["jobage", "page", "limit"]) {
      test(`--${name} non-numeric exits 1 with BAD_ARG`, async () => {
        const result = await runCLI(["search", `--${name}`, "foo"], NO_CREDS);
        expect(result.exitCode).not.toBe(0);
        const err = parsedStderr(result.stderr);
        expect(err.code).toBe("BAD_ARG");
        expect(err.error).toMatch(new RegExp(name));
      });
    }
  });

  describe("detail argument validation", () => {
    test("missing id exits 1 with NO_ID", async () => {
      const result = await runCLI(["detail"], NO_CREDS);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("NO_ID");
    });
  });

  describe("command dispatch", () => {
    test("unknown command exits 1 with BAD_CMD", async () => {
      const result = await runCLI(["frobnicate"], NO_CREDS);
      expect(result.exitCode).not.toBe(0);
      expect(parsedStderr(result.stderr).code).toBe("BAD_CMD");
    });

    test("no command prints help and exits 1", async () => {
      const result = await runCLI([], NO_CREDS);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toMatch(/USAGE/);
    });
  });

  describe("missing credentials", () => {
    test("search fails fast with a clear error when both env vars are unset", async () => {
      const result = await runCLI(["search", "-q", "genomics"], NO_CREDS);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("SEARCH_FAILED");
      expect(err.error).toMatch(/USAJOBS_API_KEY/);
      expect(err.error).toMatch(/developer\.usajobs\.gov/);
    });

    test("detail fails fast with a clear error when both env vars are unset", async () => {
      const result = await runCLI(["detail", "12345"], NO_CREDS);
      expect(result.exitCode).not.toBe(0);
      const err = parsedStderr(result.stderr);
      expect(err.code).toBe("DETAIL_FAILED");
      expect(err.error).toMatch(/USAJOBS_API_KEY/);
    });
  });
});
