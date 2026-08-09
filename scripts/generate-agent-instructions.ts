import { readFile, writeFile } from "node:fs/promises";

const repositoryRoot = new URL("../", import.meta.url);
const rulePaths = [
  ".codex/rules/agents-preamble.local.md",
  ".agents/rules/language.local.md",
  ".agents/rules/local-tmp.local.md",
  ".agents/rules/no-comments.local.md",
  ".agents/rules/no-head-tail-grep.local.md",
  ".agents/rules/no-webfetch.local.md",
  ".agents/rules/reject-words.local.md",
  ".agents/rules/require-tasks.local.md",
];

const rules = await Promise.all(
  rulePaths.map((path) => readFile(new URL(path, repositoryRoot), "utf8")),
);
const output = `${rules.map((rule) => rule.trim()).join("\n\n")}\n`;
const outputUrl = new URL("AGENTS.override.md", repositoryRoot);

await writeFile(outputUrl, output);
