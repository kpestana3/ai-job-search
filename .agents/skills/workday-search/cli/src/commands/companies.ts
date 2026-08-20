import { loadRegistry } from "../helpers.js"

export function runCompanies(format: "json" | "table"): number {
  const registry = loadRegistry()
  const entries = Object.entries(registry)

  if (format === "table") {
    if (entries.length === 0) {
      process.stdout.write("No companies in registry.\n")
      return 0
    }
    const keyWidth = Math.max(3, ...entries.map(([k]) => k.length))
    const nameWidth = Math.max(11, ...entries.map(([, c]) => c.displayName.length))
    const header = `${"KEY".padEnd(keyWidth)}  ${"DISPLAY NAME".padEnd(nameWidth)}  TENANT.WD/SITE`
    const rows = entries.map(
      ([k, c]) => `${k.padEnd(keyWidth)}  ${c.displayName.padEnd(nameWidth)}  ${c.tenant}.${c.wd}/${c.site}`,
    )
    process.stdout.write([header, "-".repeat(header.length), ...rows].join("\n") + "\n")
  } else {
    process.stdout.write(JSON.stringify(registry, null, 2) + "\n")
  }
  return 0
}
