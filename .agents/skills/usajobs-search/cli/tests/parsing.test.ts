import { describe, test, expect } from "bun:test";
import { toResult, toDetail, extractItems, totalCount, type UsaJobsItem } from "../src/helpers";

function item(overrides: Partial<UsaJobsItem["MatchedObjectDescriptor"]> = {}, id = "12345678"): UsaJobsItem {
  return {
    MatchedObjectId: id,
    MatchedObjectDescriptor: {
      PositionID: "HE-12345-25-AB",
      PositionTitle: "Genomics Data Curator",
      PositionURI: "https://www.usajobs.gov/job/12345678",
      OrganizationName: "National Institutes of Health",
      DepartmentName: "Department of Health And Human Services",
      PositionLocationDisplay: "Bethesda, Maryland",
      PositionRemuneration: [{ MinimumRange: "70000", MaximumRange: "95000", RateIntervalCode: "Per Year" }],
      PublicationStartDate: "2026-07-01",
      ApplicationCloseDate: "2026-08-01",
      UserArea: {
        Details: {
          JobSummary: "Curate genome submissions.",
          MajorDuties: ["Review submissions", "Coordinate with depositors"],
          Requirements: "PhD in a related field.",
          HowToApply: "Apply online.",
          WhoMayApply: { Name: "Public" },
          HiringPath: ["public"],
        },
      },
      ...overrides,
    },
  };
}

describe("toResult — reshape into the portal-skill contract", () => {
  test("maps MatchedObjectId -> id and core fields", () => {
    const r = toResult(item());
    expect(r.id).toBe("12345678");
    expect(r.title).toBe("Genomics Data Curator");
    expect(r.company).toBe("National Institutes of Health");
    expect(r.department).toBe("Department of Health And Human Services");
    expect(r.location).toBe("Bethesda, Maryland");
    expect(r.date).toBe("2026-07-01");
    expect(r.closes).toBe("2026-08-01");
    expect(r.url).toBe("https://www.usajobs.gov/job/12345678");
  });

  test("formats a min/max salary range", () => {
    const r = toResult(item());
    expect(r.salary).toBe("$70000-$95000 Per Year");
  });

  test("missing values are null, not omitted", () => {
    const r = toResult(
      item({ OrganizationName: undefined, DepartmentName: undefined, PositionLocationDisplay: undefined, PositionRemuneration: undefined }),
    );
    expect(r.company).toBeNull();
    expect(r.department).toBeNull();
    expect(r.location).toBeNull();
    expect(r.salary).toBeNull();
  });

  test("surfaces hiring paths", () => {
    const r = toResult(item());
    expect(r.hiringPaths).toEqual(["public"]);
  });
});

describe("toDetail — adds inline job-summary fields (no second request needed)", () => {
  test("carries summary, duties, requirements, how-to-apply", () => {
    const d = toDetail(item());
    expect(d.jobSummary).toBe("Curate genome submissions.");
    expect(d.majorDuties).toBe("Review submissions\nCoordinate with depositors");
    expect(d.requirements).toBe("PhD in a related field.");
    expect(d.howToApply).toBe("Apply online.");
    expect(d.whoMayApply).toBe("Public");
  });

  test("null detail fields when UserArea.Details is absent", () => {
    const d = toDetail(item({ UserArea: undefined }));
    expect(d.jobSummary).toBeNull();
    expect(d.majorDuties).toBeNull();
    expect(d.requirements).toBeNull();
  });

  test("a single-string MajorDuties (not an array) passes through unjoined", () => {
    const d = toDetail(item({ UserArea: { Details: { MajorDuties: "One long duties paragraph." } } }));
    expect(d.majorDuties).toBe("One long duties paragraph.");
  });
});

describe("extractItems / totalCount", () => {
  test("reads SearchResultItems and SearchResultCountAll", () => {
    const resp = { SearchResult: { SearchResultCount: 1, SearchResultCountAll: 42, SearchResultItems: [item()] } };
    expect(extractItems(resp)).toHaveLength(1);
    expect(totalCount(resp)).toBe(42);
  });

  test("falls back to SearchResultCount when CountAll is absent", () => {
    const resp = { SearchResult: { SearchResultCount: 3, SearchResultItems: [] } } as any;
    expect(totalCount(resp)).toBe(3);
  });
});
