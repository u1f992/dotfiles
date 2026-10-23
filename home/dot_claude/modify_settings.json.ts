import fs from "node:fs";
import path from "node:path";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type JsonObject = { [key: string]: Json };

const settings: JsonObject = {
  $schema: "https://json.schemastore.org/claude-code-settings.json",
  hooks: {
    Stop: [
      {
        hooks: [{ type: "command", command: "~/.claude/hooks/reject-words.ts" }],
      },
    ],
    PreToolUse: [
      {
        matcher: "Write|Edit",
        hooks: [{ type: "command", command: "~/.claude/hooks/reject-words.ts" }],
      },
    ],
  },
  permissions: {
    deny: ["Bash(gh pr create:*)", "Bash(gh issue create:*)", "Bash(git push:*)"],
  },
  attribution: { commit: "", pr: "", sessionUrl: false },
  env: {
    CLAUDE_BASH_MAINTAIN_PROJECT_WORKING_DIR: "1",
    CLAUDE_CODE_THRIFTY_SONIC: "0",
  },
  language: "japanese",
  autoMemoryEnabled: false,
};

const isObject = (value: Json): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const mergeOverwrite = (base: JsonObject, overlay: JsonObject): JsonObject => {
  const merged = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    const current = merged[key];
    merged[key] =
      current !== undefined && isObject(current) && isObject(value)
        ? mergeOverwrite(current, value)
        : value;
  }
  return merged;
};

const sortKeys = (value: Json): Json => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]): [string, Json] => [key, sortKeys(entry)]),
  );
};

const commandsThatWriteTargets = new Set(["apply", "edit", "init", "update"]);

const backupPattern = /^settings\.json\.\d{8}T\d{6}\.\d{3}Z\.orig$/;

const saveBackup = (target: string, content: string) => {
  const dir = path.dirname(target);
  const latest = fs
    .readdirSync(dir)
    .filter((name) => backupPattern.test(name))
    .sort()
    .at(-1);
  if (latest !== undefined && fs.readFileSync(path.join(dir, latest), "utf8") === content) return;
  const stamp = new Date().toISOString().replaceAll(/[-:]/g, "");
  fs.writeFileSync(path.join(dir, `settings.json.${stamp}.orig`), content, { flag: "wx" });
};

const current = fs.readFileSync(0, "utf8");
const existing: Json = current === "" ? {} : (JSON.parse(current) as Json);
if (!isObject(existing)) throw new TypeError("settings.json must hold a JSON object");
const next = `${JSON.stringify(sortKeys(mergeOverwrite(existing, settings)), null, 2)}\n`;

if (
  current !== "" &&
  next !== current &&
  commandsThatWriteTargets.has(process.env.CHEZMOI_COMMAND ?? "")
) {
  const destDir = process.env.CHEZMOI_DEST_DIR;
  if (destDir === undefined) throw new Error("CHEZMOI_DEST_DIR is not set");
  saveBackup(path.join(destDir, ".claude", "settings.json"), current);
}
fs.writeFileSync(1, next);
