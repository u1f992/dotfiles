import { readdir, readFile, writeFile } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const rulesDirectory = new URL(".agents/rules/", repositoryRoot);

const ruleNames = (await readdir(rulesDirectory))
  .filter((name) => name.endsWith(".md"))
  .sort();
const rules = await Promise.all(
  ruleNames.map((name) => readFile(new URL(name, rulesDirectory), "utf8")),
);
const output = `${rules.map((rule) => rule.trim()).join("\n\n")}\n`;
const outputUrl = new URL(".codex/AGENTS.md", repositoryRoot);

await writeFile(outputUrl, output);
