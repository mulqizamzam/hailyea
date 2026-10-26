export function renderMarkdown(delta) {
  const lines = [
    `# Hailyea Delta: ${delta.before.snapshotId} → ${delta.after.snapshotId}`, "",
    `Before: **${delta.before.artifact.name}** (${delta.before.artifact.sha256 ?? "hash unavailable"})`,
    `After: **${delta.after.artifact.name}** (${delta.after.artifact.sha256 ?? "hash unavailable"})`, "",
    "## Summary", "",
    `- Functions compared: ${delta.summary.functionCount}`,
    ...Object.entries(delta.summary.functions).map(([status,count]) => `- ${status}: ${count}`),
    `- Findings tracked: ${delta.summary.findingCount}`, "",
    "## Function changes", "",
    "| Before ID | After ID | Status | Match | Confidence | Address moved | Size Δ |",
    "|---|---|---|---|---|---|---|",
    ...delta.functions.map(f => `| ${f.beforeId ?? "—"} | ${f.afterId ?? "—"} | ${f.status} | ${f.match?.method ?? "—"} | ${f.match?.confidence ?? "—"} | ${f.movement ? (f.movement.moved ? `${f.movement.before ?? "—"} → ${f.movement.after ?? "—"}` : "no") : "—"} | ${f.sizeDelta ?? "—"} |`),
    "", "## Finding reconciliation", "",
    "| Previous finding | Candidate finding | Status | Severity | Confidence | Evidence (before → after) | False-positive review | Rationale |",
    "|---|---|---|---|---|---|---|---|",
    ...delta.findings.map(f => `| ${f.beforeId ?? "—"} | ${f.afterId ?? "—"} | ${f.status} | ${f.severity ?? "unknown"} | ${f.confidence ?? "low"} | ${(f.beforeEvidence ?? []).join("; ") || "—"} → ${(f.afterEvidence ?? []).join("; ") || "—"} | ${f.falsePositiveReview ?? "needs_analyst_review"} | ${f.rationale} |`),
    "", "## Warnings", "", ...(delta.warnings.length ? delta.warnings.map(w => `- ${w}`) : ["- None."]),
    "", "## Limitations", "", ...delta.limitations.map(x => `- ${x}`), ""
  ];
  return lines.join("\n");
}
