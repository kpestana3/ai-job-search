import { describe, test, expect } from "bun:test";
import { toResult, toDetail, cleanHtml, resolveCompany, loadRegistry, type CompanyConfig, type WorkdayJobPosting } from "../src/helpers";
import { normalizeExternalPath } from "../src/commands/detail";

const illumina: CompanyConfig = { displayName: "Illumina", tenant: "illumina", wd: "wd1", site: "illumina-careers" };

function posting(overrides: Partial<WorkdayJobPosting> = {}): WorkdayJobPosting {
  return {
    title: "Sr Director, Population Genomics",
    externalPath: "/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1",
    locationsText: "US - California - San Diego",
    postedOn: "Posted 26 Days Ago",
    bulletFields: ["43041-JOB"],
    ...overrides,
  };
}

describe("toResult — reshape into the portal-skill contract", () => {
  test("maps externalPath -> id and builds the human-facing URL", () => {
    const r = toResult(illumina, posting());
    expect(r.id).toBe("/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1");
    expect(r.url).toBe("https://illumina.wd1.myworkdayjobs.com/illumina-careers/job/US---California---San-Diego/Sr-Director---Population-Genomics_43041-JOB-1");
  });

  test("carries the required contract fields", () => {
    const r = toResult(illumina, posting());
    expect(r).toMatchObject({
      title: "Sr Director, Population Genomics",
      company: "Illumina",
      location: "US - California - San Diego",
      reqId: "43041-JOB",
    });
  });

  test("missing values are null, not omitted", () => {
    const r = toResult(illumina, posting({ locationsText: undefined, postedOn: undefined, bulletFields: undefined }));
    expect(r.location).toBeNull();
    expect(r.date).toBeNull();
    expect(r.reqId).toBeNull();
  });
});

describe("toDetail — adds fields only present in the detail response", () => {
  test("prefers the API's externalUrl when present", () => {
    const d = toDetail(illumina, posting().externalPath, {
      id: "x", title: "T", jobDescription: "<p>Hi</p>", startDate: "2026-06-23", timeType: "Full time",
      country: { descriptor: "United States of America" }, externalUrl: "https://illumina.wd1.myworkdayjobs.com/illumina-careers/job/x",
    });
    expect(d.url).toBe("https://illumina.wd1.myworkdayjobs.com/illumina-careers/job/x");
    expect(d.startDate).toBe("2026-06-23");
    expect(d.timeType).toBe("Full time");
    expect(d.country).toBe("United States of America");
    expect(d.description).toBe("Hi");
  });

  test("falls back to a constructed URL when externalUrl is absent", () => {
    const d = toDetail(illumina, "/job/x", { id: "x", title: "T" });
    expect(d.url).toBe("https://illumina.wd1.myworkdayjobs.com/illumina-careers/job/x");
  });

  test("null detail-only fields when absent", () => {
    const d = toDetail(illumina, "/job/x", { id: "x", title: "T" });
    expect(d.startDate).toBeNull();
    expect(d.timeType).toBeNull();
    expect(d.country).toBeNull();
    expect(d.description).toBeNull();
  });
});

describe("cleanHtml", () => {
  test("preserves paragraph breaks between blocks", () => {
    expect(cleanHtml("<p>One</p><p>Two</p>")).toBe("One\nTwo");
  });
  test("decodes numeric entities", () => {
    expect(cleanHtml("Caf&#233;")).toBe("Café");
  });
  test("returns null for empty input", () => {
    expect(cleanHtml("")).toBeNull();
    expect(cleanHtml(null)).toBeNull();
    expect(cleanHtml(undefined)).toBeNull();
  });
});

describe("normalizeExternalPath", () => {
  test("passes a bare /job/... path through", () => {
    expect(normalizeExternalPath("/job/US---California/Foo_123")).toBe("/job/US---California/Foo_123");
  });
  test("extracts the path from a full URL", () => {
    expect(normalizeExternalPath("https://illumina.wd1.myworkdayjobs.com/illumina-careers/job/US---California/Foo_123")).toBe(
      "/job/US---California/Foo_123",
    );
  });
  test("rejects a string with no /job/ segment", () => {
    expect(normalizeExternalPath("not a path")).toBeNull();
    expect(normalizeExternalPath("")).toBeNull();
  });
});

describe("company registry", () => {
  test("resolves a known company key", () => {
    const c = resolveCompany("illumina");
    expect(c).toMatchObject({ tenant: "illumina", wd: "wd1", site: "illumina-careers" });
  });

  test("returns null for an unknown key", () => {
    expect(resolveCompany("not-a-real-company")).toBeNull();
  });

  test("the registry is non-empty and every entry has the required fields", () => {
    const registry = loadRegistry();
    const keys = Object.keys(registry);
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) {
      const c = registry[key];
      expect(c.displayName).toBeTruthy();
      expect(c.tenant).toBeTruthy();
      expect(c.wd).toBeTruthy();
      expect(c.site).toBeTruthy();
    }
  });
});
