import { validateSnapshot } from "./schema.mjs";
import { matchFunctions } from "./match-functions.mjs";
const stable = value => JSON.stringify(value, Object.keys(value ?? {}).sort());
const comparable = fn => ({ name: fn.name ?? null, namespace: fn.namespace ?? null, fingerprint: fn.fingerprint ?? null, size: fn.size ?? null, callingConvention: fn.callingConvention ?? null });
function changes(a, b) {
  const left = comparable(a), right = comparable(b), out = [];
  for (const field of Object.keys(left)) if (left[field] !== right[field]) out.push({ field, before: left[field], after: right[field] });
  return out;
}
function assessFunctionChange(status, changes, beforeAddress, afterAddress) {
  const fields = new Set(changes.map(change => change.field));
  const moved = Boolean(beforeAddress && afterAddress && beforeAddress !== afterAddress);
  let riskLevel = "info", category = "no-observed-metadata-change", rationale = "No compared metadata field changed.";
  if (status === "uncertain") { riskLevel = "review"; category = "ambiguous-match"; rationale = "Identity is ambiguous; manually inspect candidates."; }
  else if (status === "added") { riskLevel = "medium"; category = "new-function"; rationale = "A function appears only in the candidate snapshot; confirm the addition is expected."; }
  else if (status === "removed") { riskLevel = "medium"; category = "missing-function"; rationale = "A baseline function was not matched; coverage or renaming may explain this."; }
  else if (fields.has("fingerprint") || fields.has("callingConvention")) { riskLevel = "high"; category = "implementation-or-interface-change"; rationale = "Fingerprint or calling convention changed; validate behavior with additional analysis."; }
  else if (fields.has("size")) { riskLevel = "medium"; category = "function-size-change"; rationale = "Function size changed; size alone does not establish behavioral or security impact."; }
  else if (fields.has("name") || fields.has("namespace")) { riskLevel = "medium"; category = "symbol-change"; rationale = "Symbol metadata changed; confirm whether this is a rename or a different function."; }
  else if (changes.length) { riskLevel = "medium"; category = "metadata-change"; rationale = "Compared function metadata changed."; }
  else if (moved) { category = "address-movement"; rationale = "The address moved while compared identity metadata stayed stable."; }
  const evidence = [];
  if (beforeAddress != null || afterAddress != null) evidence.push({ type: "address", before: beforeAddress ?? null, after: afterAddress ?? null });
  for (const change of changes) evidence.push({ type: "field-change", ...change });
  return { category, riskLevel, moved, rationale, evidence, caveat: "Heuristic triage only; not a vulnerability verdict." };
}

export function compareSnapshots(beforeInput, afterInput) {
  const before = validateSnapshot(beforeInput), after = validateSnapshot(afterInput);
  const matched = matchFunctions(before.functions, after.functions);
  const functions = matched.matches.map(m => {
    const delta = changes(m.before, m.after);
    const status = m.uncertain ? "uncertain" : delta.length ? "changed" : "unchanged";
    const item = { beforeId: m.before.id, afterId: m.after.id, beforeAddress: m.before.address ?? null, afterAddress: m.after.address ?? null, movement: { moved: (m.before.address ?? null) !== (m.after.address ?? null), before: m.before.address ?? null, after: m.after.address ?? null }, sizeDelta: Number.isFinite(m.before.size) && Number.isFinite(m.after.size) ? m.after.size - m.before.size : null, status, match: { method: m.method, confidence: m.confidence }, changes: delta };
    item.assessment = assessFunctionChange(status, delta, item.beforeAddress, item.afterAddress);
    return item;
  });
  for (const fn of matched.unmatchedBefore) { const item = { beforeId: fn.id, beforeAddress: fn.address ?? null, status: "removed", match: null, changes: [] }; item.assessment = assessFunctionChange("removed", [], item.beforeAddress, null); functions.push(item); }
  for (const fn of matched.unmatchedAfter) { const item = { afterId: fn.id, afterAddress: fn.address ?? null, status: "added", match: null, changes: [] }; item.assessment = assessFunctionChange("added", [], null, item.afterAddress); functions.push(item); }
  for (const amb of matched.ambiguous) { const item = { status: "uncertain", match: { method: amb.method, confidence: "low" }, ambiguity: amb, changes: [] }; item.assessment = assessFunctionChange("uncertain", [], null, null); functions.push(item); }
  functions.sort((a,b) => String(a.beforeId ?? a.afterId ?? a.ambiguity?.key).localeCompare(String(b.beforeId ?? b.afterId ?? b.ambiguity?.key)));
  const afterFunctionById = new Map(functions.filter(x => x.afterId).map(x => [x.afterId, x]));
  const beforeFunctionById = new Map(functions.filter(x => x.beforeId).map(x => [x.beforeId, x]));
  const candidateFindings = after.findings.map(f => ({ ...f }));
  const usedCandidate = new Set(), findings = [];
  for (const old of before.findings) {
    const oldFn = old.functionId ? beforeFunctionById.get(old.functionId) : null;
    const candidates = candidateFindings.filter((f, i) => !usedCandidate.has(i) && (f.ruleId ?? f.title) === (old.ruleId ?? old.title) &&
      (!oldFn || !f.functionId || afterFunctionById.get(f.functionId)?.beforeId === old.functionId));
    if (candidates.length === 1) {
      const idx = candidateFindings.indexOf(candidates[0]); usedCandidate.add(idx);
      findings.push({ beforeId: old.id, afterId: candidates[0].id, status: "still_detected", ruleId: old.ruleId ?? null, severity: candidates[0].severity ?? old.severity ?? "unknown", beforeFunctionId: old.functionId ?? null, afterFunctionId: candidates[0].functionId ?? null, functionStatus: oldFn?.status ?? "unknown", confidence: oldFn?.match?.confidence ?? "low", beforeEvidence: old.evidence ?? [], afterEvidence: candidates[0].evidence ?? [], falsePositiveReview: "needs_analyst_review", rationale: "The same rule/title is present in the candidate snapshot; recheck impact if the function changed." });
    } else if (candidates.length > 1) {
      findings.push({ beforeId: old.id, status: "ambiguous_review", ruleId: old.ruleId ?? null, severity: old.severity ?? "unknown", confidence: "low", beforeEvidence: old.evidence ?? [], afterEvidence: candidates.flatMap(f => f.evidence ?? []), falsePositiveReview: "needs_analyst_review", rationale: "Multiple candidate findings could correspond to this prior finding." });
    } else {
      findings.push({ beforeId: old.id, status: "not_reobserved_review", ruleId: old.ruleId ?? null, severity: old.severity ?? "unknown", confidence: "low", beforeEvidence: old.evidence ?? [], afterEvidence: [], falsePositiveReview: "needs_analyst_review", rationale: "The finding was not reobserved. Absence in this snapshot is not proof of resolution." });
    }
  }
  candidateFindings.forEach((f, i) => { if (!usedCandidate.has(i)) findings.push({ afterId: f.id, status: "newly_observed", ruleId: f.ruleId ?? null, severity: f.severity ?? "unknown", confidence: "low", beforeEvidence: [], afterEvidence: f.evidence ?? [], falsePositiveReview: "needs_analyst_review", rationale: "This finding appears only in the candidate snapshot." }); });
  const warnings = [];
  if (!before.tool || !after.tool) warnings.push("Tool metadata is missing from one or both snapshots; comparison provenance is incomplete.");
  else if (before.tool.name !== after.tool.name || before.tool.version !== after.tool.version || before.tool.configurationId !== after.tool.configurationId) warnings.push("Analysis tool versions or configurations differ; deltas may reflect tooling changes.");
  if (before.artifact.sha256 && after.artifact.sha256 && before.artifact.sha256 === after.artifact.sha256 && functions.some(f => f.status === "changed")) warnings.push("Artifact hashes are identical but function metadata differs; investigate inconsistent exports.");
  return { comparisonVersion: "1.0", before: { snapshotId: before.snapshotId, artifact: before.artifact }, after: { snapshotId: after.snapshotId, artifact: after.artifact }, summary: { functionCount: functions.length, functions: Object.fromEntries(["unchanged","changed","added","removed","uncertain"].map(s => [s, functions.filter(f => f.status === s).length])), findingCount: findings.length, findings: Object.fromEntries([...new Set(findings.map(f => f.status))].sort().map(s => [s, findings.filter(f => f.status === s).length])) }, functions, findings, ambiguousMatches: matched.ambiguous, warnings, limitations: ["Function matching is heuristic and depends on the quality of the supplied snapshots.", "A missing finding is not evidence that a vulnerability or behavior has been fixed.", "This tool compares exported analysis data; it does not disassemble or execute binaries."] };
}
