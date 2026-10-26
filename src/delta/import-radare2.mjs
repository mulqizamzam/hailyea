import { validateSnapshot } from "./schema.mjs";

const nonBlank = value => typeof value === "string" && value.trim().length > 0;

function addressOf(value, index) {
  if (typeof value === "number") {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new TypeError(`functions[${index}].offset must be a non-negative safe integer or address string`);
    }
    return `0x${value.toString(16)}`;
  }
  if (typeof value === "string") {
    const address = value.trim();
    if (/^0x[0-9a-f]+$/i.test(address)) return `0x${BigInt(address).toString(16)}`;
    if (/^[0-9]+$/.test(address)) return `0x${BigInt(address).toString(16)}`;
  }
  throw new TypeError(`functions[${index}].offset must be a non-negative integer or address string`);
}

function basenameOf(path) {
  if (typeof path !== "string" || !path.trim()) return undefined;
  return path.split(/[\\/]/).filter(Boolean).at(-1);
}

function firstString(...values) {
  return values.find(nonBlank);
}

function architectureOf(bin) {
  const arch = firstString(bin.arch, bin.architecture);
  const bits = Number.isInteger(bin.bits) && bin.bits > 0 ? bin.bits : undefined;
  if (!arch) return bits === undefined ? "unknown" : `unknown-${bits}`;
  if (arch === "x86" && bits === 64) return "x86_64";
  if (arch === "arm" && bits === 64) return "arm64";
  if (arch === "arm" && bits === 32) return "arm32";
  return bits === undefined || arch.endsWith(String(bits)) ? arch : `${arch}-${bits}`;
}

/**
 * Convert a radare2 `aflj` function array plus `ij` binary metadata into a
 * Hailyea Analysis Snapshot v1 document.
 *
 * Raw `aflj` offsets become per-snapshot IDs and display addresses, not stable
 * cross-build identities. Renamed or moved functions therefore remain uncertain
 * unless upstream exports supply another matching key in a later adapter.
 */
export function importRadare2Snapshot(functionRows, binaryInfo, options = {}) {
  if (!Array.isArray(functionRows)) {
    throw new TypeError("radare2 functions input must be the JSON array emitted by aflj");
  }
  if (!binaryInfo || typeof binaryInfo !== "object" || Array.isArray(binaryInfo)) {
    throw new TypeError("radare2 binary info must be the JSON object emitted by ij");
  }
  if (!nonBlank(options.snapshotId)) {
    throw new TypeError("snapshotId is required");
  }

  const bin = binaryInfo.bin && typeof binaryInfo.bin === "object" && !Array.isArray(binaryInfo.bin)
    ? binaryInfo.bin
    : {};
  const core = binaryInfo.core && typeof binaryInfo.core === "object" && !Array.isArray(binaryInfo.core)
    ? binaryInfo.core
    : {};
  const artifactName = firstString(options.artifactName, basenameOf(core.file), basenameOf(binaryInfo.file));
  if (!artifactName) {
    throw new TypeError("artifactName is required when ij metadata has no file path");
  }
  if (options.sha256 !== undefined && (typeof options.sha256 !== "string" || !/^[a-f0-9]{64}$/i.test(options.sha256))) {
    throw new TypeError("sha256 must contain exactly 64 hexadecimal characters");
  }

  const functions = functionRows.map((row, index) => {
    if (!row || typeof row !== "object" || Array.isArray(row)) {
      throw new TypeError(`functions[${index}] must be an object`);
    }
    const address = addressOf(row.offset, index);
    const fn = { id: `radare2:${address}`, address };
    if (nonBlank(row.name)) fn.name = row.name;
    if (row.size !== undefined) {
      if (!Number.isSafeInteger(row.size) || row.size < 0) {
        throw new TypeError(`functions[${index}].size must be a non-negative safe integer`);
      }
      fn.size = row.size;
    }
    return fn;
  });

  const snapshot = {
    schemaVersion: "1.0",
    snapshotId: options.snapshotId,
    artifact: {
      name: artifactName,
      format: firstString(options.format, bin.bintype, bin.class, core.format, core.type) ?? "unknown",
      architecture: options.architecture ?? architectureOf(bin),
      ...(options.sha256 ? { sha256: options.sha256.toLowerCase() } : {}),
    },
    tool: {
      name: "radare2",
      configurationId: options.configurationId ?? "aaa+aflj",
      ...(nonBlank(options.toolVersion) ? { version: options.toolVersion } : {}),
    },
    functions,
  };
  return validateSnapshot(snapshot);
}
