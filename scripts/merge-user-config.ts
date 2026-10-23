import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";

import { parse as parseToml, stringify as stringifyToml } from "smol-toml";

type Table = Record<string, unknown>;

const isTable = (value: unknown): value is Table =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const merge = (base: unknown, overlay: unknown): unknown => {
  if (!isTable(base) || !isTable(overlay)) return overlay;
  const merged: Table = { ...base };
  for (const [key, value] of Object.entries(overlay)) {
    merged[key] = merge(base[key], value);
  }
  return merged;
};

type Format = {
  parse: (text: string) => unknown;
  stringify: (value: unknown) => string;
};

const json: Format = {
  parse: (text) => JSON.parse(text) as unknown,
  stringify: (value) => `${JSON.stringify(value, null, 2)}\n`,
};

const toml: Format = {
  parse: parseToml,
  stringify: (value) => `${stringifyToml(value)}\n`,
};

const readIfExists = async (file: string): Promise<string | undefined> => {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return undefined;
    throw error;
  }
};

const repositoryRoot = new URL("../", import.meta.url);
const backupSuffix = `.${new Date().toISOString().replace(/[:.]/g, "-")}.bak`;

const install = async (templatePath: string, target: string, format: Format): Promise<void> => {
  const template = format.parse(await readFile(new URL(templatePath, repositoryRoot), "utf8"));
  const existingText = await readIfExists(target);
  const existing = existingText === undefined ? undefined : format.parse(existingText);
  const merged = format.stringify(merge(existing, template));
  if (existing !== undefined && merged === format.stringify(existing)) {
    console.log(`${target}: up to date`);
    return;
  }
  if (existingText !== undefined) {
    const backup = `${target}${backupSuffix}`;
    await copyFile(target, backup);
    console.log(`${target}: backed up to ${backup}`);
  }
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, merged);
  console.log(`${target}: written`);
};

const home = homedir();

await install(".claude/settings.json", path.join(home, ".claude", "settings.json"), json);
await install(".codex/config.toml", path.join(home, ".codex", "config.toml"), toml);
