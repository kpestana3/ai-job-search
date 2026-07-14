import { describe, test, expect } from "bun:test";
import { parseIndex, inferDate, normalizeId, parseDetail } from "../src/helpers";

// Minimal synthetic index line matching the real <pre> block format:
// <a href="/brian/evoldir/Jobs//<filename>"><filename></a>   <size>   <Mon DD HH:MM>
function line(filename: string, size = "1 KB", date = "Apr 18 08:53"): string {
  return `<a href="/brian/evoldir/Jobs//${filename}">${filename}</a>                    ${size}        ${date}`;
}

describe("parseIndex", () => {
  test("parses filename, url, and heuristic company from a single line", () => {
    const now = new Date(2026, 3, 20); // Apr 20, 2026 — after the posting's Apr 18
    const [p] = parseIndex(line("UKansas.LabTech.ComplexTraits"), now);
    expect(p.id).toBe("UKansas.LabTech.ComplexTraits");
    expect(p.title).toBe("UKansas.LabTech.ComplexTraits");
    expect(p.company).toBe("UKansas");
    expect(p.location).toBeNull();
    expect(p.url).toBe("https://evol.mcmaster.ca/brian/evoldir/Jobs//UKansas.LabTech.ComplexTraits");
  });

  test("replaces underscores with spaces in the heuristic company field", () => {
    const [p] = parseIndex(line("Flagstaff_Arizona.MolEcolGenomics"), new Date(2026, 3, 20));
    expect(p.company).toBe("Flagstaff Arizona");
  });

  test("parses multiple lines independently, skipping nothing valid", () => {
    const html = [line("A.Postdoc.Genomics"), line("B.LabTech.Ecology", "778 bytes", "Apr 15 08:55")].join("\n");
    const postings = parseIndex(html, new Date(2026, 3, 20));
    expect(postings).toHaveLength(2);
    expect(postings[0].id).toBe("A.Postdoc.Genomics");
    expect(postings[1].id).toBe("B.LabTech.Ecology");
  });

  test("a malformed line (no date) does not break parsing of the rest", () => {
    const malformed = `<a href="/brian/evoldir/Jobs//Broken">Broken</a> not-a-size not-a-date`;
    const html = [malformed, line("Good.Postdoc.Genomics")].join("\n");
    const postings = parseIndex(html, new Date(2026, 3, 20));
    expect(postings).toHaveLength(1);
    expect(postings[0].id).toBe("Good.Postdoc.Genomics");
  });
});

describe("inferDate", () => {
  test("assumes current year when the month/day is in the past", () => {
    const now = new Date(2026, 6, 13); // Jul 13, 2026
    const iso = inferDate("Apr", "18", "08:53", now);
    expect(iso).toContain("2026-04-18");
  });

  test("assumes last year when the month/day would be in the future", () => {
    const now = new Date(2026, 3, 20); // Apr 20, 2026
    const iso = inferDate("Dec", "1", "10:00", now);
    expect(iso).toContain("2025-12-01");
  });

  test("returns null for an unrecognized month abbreviation", () => {
    expect(inferDate("Xyz", "1", "10:00", new Date(2026, 3, 20))).toBeNull();
  });
});

describe("normalizeId", () => {
  test("passes through a bare filename slug", () => {
    expect(normalizeId("UKansas.LabTech.ComplexTraits")).toBe("UKansas.LabTech.ComplexTraits");
  });

  test("extracts the filename from a full detail URL (double slash preserved in path, not id)", () => {
    expect(normalizeId("https://evol.mcmaster.ca/brian/evoldir/Jobs//UKansas.LabTech.ComplexTraits")).toBe(
      "UKansas.LabTech.ComplexTraits",
    );
  });

  test("returns null for an empty string", () => {
    expect(normalizeId("")).toBeNull();
  });
});

describe("parseDetail", () => {
  test("extracts a best-effort contact email when present", () => {
    const body = "Feel free to email me. Stuart Macdonald (sjmac@ku.edu)";
    const d = parseDetail(body, "UKansas.LabTech.ComplexTraits");
    expect(d.contactEmail).toBe("sjmac@ku.edu");
    expect(d.description).toContain("Stuart Macdonald");
  });

  test("returns null contactEmail when no email is present", () => {
    const d = parseDetail("No contact info here.", "Some.Posting");
    expect(d.contactEmail).toBeNull();
  });

  test("returns null description for empty text (404 case)", () => {
    const d = parseDetail("", "Missing.Posting");
    expect(d.description).toBeNull();
  });
});
