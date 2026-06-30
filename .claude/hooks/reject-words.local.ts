#!/usr/bin/env node
import fs from "node:fs";

/**
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#stop-input
 * latest: https://code.claude.com/docs/en/hooks#stop-input
 */
type StopHookInput = {
  stop_hook_active: boolean;
  last_assistant_message: string;
};
const isStopHookInput = (x: unknown): x is StopHookInput =>
  typeof x === "object" &&
  x !== null &&
  "stop_hook_active" in x &&
  typeof x.stop_hook_active === "boolean" &&
  "last_assistant_message" in x &&
  typeof x.last_assistant_message === "string";

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");

const inputJson = fs.readFileSync(0, "utf8");
const input = JSON.parse(inputJson);
if (!isStopHookInput(input)) {
  throw new Error("unexpected Stop hook input");
}
// 自分のブロックで再発火した場合はブロックしない（無限ループ防止）
if (input.stop_hook_active) {
  process.exit(0);
}

const bannedPath = new URL("./reject-words.local.json", import.meta.url);
const bannedJson = fs.readFileSync(bannedPath, "utf8");
const banned = JSON.parse(bannedJson);
if (!isStringArray(banned)) {
  throw new Error(`${bannedPath.pathname} must be a JSON array of strings`);
}

const message = input.last_assistant_message.toLowerCase();
const found = banned.filter((word) => message.includes(word.toLowerCase()));
if (found.length > 0) {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: `The response contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
    }),
  );
}

process.exit(0);
