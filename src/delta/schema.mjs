export class SnapshotValidationError extends Error {
  constructor(problems) { super(problems.join("\n")); this.name = "SnapshotValidationError"; this.problems = problems; }
}
const nonBlank = v => typeof v === "string" && v.trim().length > 0;
export function validateSnapshot(input) {
  const problems = [];
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new SnapshotValidationError(["snapshot must be an object"]);
  if (input.schemaVersion !== "1.0") problems.push("schemaVersion must be \"1.0\"");
  if (!nonBlank(input.snapshotId)) problems.push("snapshotId must be a non-empty string");
  if (!input.artifact || typeof input.artifact !== "object" || !nonBlank(input.artifact.name)) problems.push("artifact.name is required");
  for (const field of ["functions", "findings"]) if (input[field] !== undefined && !Array.isArray(input[field])) problems.push(field + " must be an array");
  const functions = input.functions ?? [];
  const ids = new Set();
  functions.forEach((fn, i) => {
    if (!fn || typeof fn !== "object" || !nonBlank(fn.id)) { problems.push(`functions[${i}].id is required`); return; }
    if (ids.has(fn.id)) problems.push(`duplicate function id: ${fn.id}`);
    ids.add(fn.id);
    for (const field of ["address","name","namespace","stableId","fingerprint"]) if (fn[field] !== undefined && typeof fn[field] !== "string") problems.push(`functions[${i}].${field} must be a string`);
  });
  const findingIds = new Set();
  (input.findings ?? []).forEach((finding, i) => {
    if (!finding || typeof finding !== "object" || !nonBlank(finding.id)) { problems.push(`findings[${i}].id is required`); return; }
    if (findingIds.has(finding.id)) problems.push(`duplicate finding id: ${finding.id}`);
    findingIds.add(finding.id);
    if (finding.functionId && !ids.has(finding.functionId)) problems.push(`findings[${i}].functionId references missing function "${finding.functionId}"`);
    if (finding.severity !== undefined && !["info","low","medium","high","critical","unknown"].includes(finding.severity)) problems.push(`findings[${i}].severity is invalid`);
  });
  if (input.tool !== undefined && (!input.tool || typeof input.tool !== "object" || Array.isArray(input.tool))) problems.push("tool must be an object");
  if (problems.length) throw new SnapshotValidationError(problems);
  return { ...input, functions, findings: input.findings ?? [] };
}
