import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

function parseEnvLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) return null;
  const withoutExport = trimmed.startsWith("export ") ? trimmed.slice(7).trim() : trimmed;
  const separator = withoutExport.indexOf("=");
  if (separator <= 0) return null;
  const key = withoutExport.slice(0, separator).trim();
  let value = withoutExport.slice(separator + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return { key, value };
}

export function loadEnvLocal(cwd = process.cwd()) {
  const root =
    typeof cwd === "string" && cwd.trim().length > 0 ? cwd.trim() : process.cwd();
  const envPath = path.join(root, ".env.local");
  if (!existsSync(envPath)) return { loaded: false, path: envPath };

  const contents = readFileSync(envPath, "utf8");
  for (const line of contents.split(/\r?\n/)) {
    const parsed = parseEnvLine(line);
    if (!parsed || process.env[parsed.key] != null) continue;
    process.env[parsed.key] = parsed.value;
  }

  return { loaded: true, path: envPath };
}
