const key = (...parts) => parts.filter(Boolean).join("::");
const indexBy = (items, fn) => {
  const map = new Map();
  for (const item of items) { const k = fn(item); if (!k) continue; if (!map.has(k)) map.set(k, []); map.get(k).push(item); }
  return map;
};
function matchPass(before, after, method, keyFn, confidence, matches, usedBefore, usedAfter) {
  const left = indexBy(before.filter(x => !usedBefore.has(x.id)), keyFn);
  const right = indexBy(after.filter(x => !usedAfter.has(x.id)), keyFn);
  for (const [k, xs] of left) {
    const ys = right.get(k);
    if (xs.length === 1 && ys?.length === 1) {
      matches.push({ before: xs[0], after: ys[0], method, confidence, key: k });
      usedBefore.add(xs[0].id); usedAfter.add(ys[0].id);
    }
  }
}
export function matchFunctions(before, after) {
  const matches = [], usedBefore = new Set(), usedAfter = new Set();
  matchPass(before, after, "stableId", x => x.stableId, "high", matches, usedBefore, usedAfter);
  matchPass(before, after, "fingerprint", x => x.fingerprint, "high", matches, usedBefore, usedAfter);
  matchPass(before, after, "symbol", x => x.name ? key(x.namespace, x.name) : null, "medium", matches, usedBefore, usedAfter);
  const remainingBefore = before.filter(x => !usedBefore.has(x.id));
  const remainingAfter = after.filter(x => !usedAfter.has(x.id));
  const beforeAddr = indexBy(remainingBefore, x => x.address);
  const afterAddr = indexBy(remainingAfter, x => x.address);
  for (const [addr, xs] of beforeAddr) {
    const ys = afterAddr.get(addr);
    if (addr && xs.length === 1 && ys?.length === 1) {
      matches.push({ before: xs[0], after: ys[0], method: "address", confidence: "low", key: addr, uncertain: true });
      usedBefore.add(xs[0].id); usedAfter.add(ys[0].id);
    }
  }
  const ambiguous = [];
  for (const [method, fn] of [["fingerprint", x => x.fingerprint], ["symbol", x => x.name ? key(x.namespace, x.name) : null]]) {
    const l = indexBy(before.filter(x => !usedBefore.has(x.id)), fn);
    const r = indexBy(after.filter(x => !usedAfter.has(x.id)), fn);
    for (const [k, xs] of l) if (k && (xs.length > 1 || (r.get(k)?.length ?? 0) > 1) && r.has(k)) {
      ambiguous.push({ method, key: k, beforeIds: xs.map(x => x.id).sort(), afterIds: (r.get(k) ?? []).map(x => x.id).sort() });
    }
  }
  return { matches, unmatchedBefore: before.filter(x => !usedBefore.has(x.id)), unmatchedAfter: after.filter(x => !usedAfter.has(x.id)), ambiguous };
}
