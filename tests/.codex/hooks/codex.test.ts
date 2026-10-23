import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import bannedWords from "../../../.codex/hooks/banned-words.ts";
import {
  adapter,
  extractAddedContent,
  isApplyPatchToolUseInput,
  isStopHookInput,
  type StopDecision,
} from "../../../.codex/hooks/codex.ts";
import { rejectWords } from "../../../.codex/hooks/policy/reject-words.ts";

const common = {
  session_id: "session",
  transcript_path: null,
  cwd: "/repo",
  model: "gpt",
  permission_mode: "default",
} as const;

const stop = (last_assistant_message: string | null) => ({
  ...common,
  hook_event_name: "Stop",
  turn_id: "turn",
  stop_hook_active: false,
  last_assistant_message,
});

const applyPatch = (command: string) => ({
  ...common,
  hook_event_name: "PreToolUse",
  turn_id: "turn",
  tool_name: "apply_patch",
  tool_use_id: "tool",
  tool_input: { command },
});

test("CodexのStop入力はnullの最終メッセージも受け入れる", () => {
  assert.equal(isStopHookInput(stop(null)), true);
});

test("Codexのapply_patch入力を判定する", () => {
  assert.equal(isApplyPatchToolUseInput(applyPatch("*** Begin Patch")), true);
});

test("apply_patchから追加行だけを抽出する", () => {
  const patch = [
    "*** Begin Patch",
    "*** Update File: x.md",
    " context",
    "-deleted",
    "+added",
    "+second",
    "*** End Patch",
  ].join("\n");
  assert.equal(extractAddedContent(patch), "added\nsecond");
});

const bans = [{ patterns: [/forbidden/], reason: "test" }];
const bannedUrl = new URL("file:///hooks/banned-words.ts");
const checkPatch = (command: string) =>
  rejectWords(
    adapter,
    applyPatch(command),
    { url: bannedUrl, content: bans },
    (text) => text,
  );

test("追加行の禁止語を拒否する", () => {
  const decision = checkPatch(
    "*** Begin Patch\n*** Update File: x\n+forbidden\n*** End Patch",
  );
  assert.ok("hookSpecificOutput" in decision);
  assert.equal(decision.hookSpecificOutput?.permissionDecision, "deny");
});

test("削除行と文脈行の禁止語は拒否しない", () => {
  const decision = checkPatch(
    "*** Begin Patch\n*** Update File: x\n forbidden\n-forbidden\n+clean\n*** End Patch",
  );
  assert.deepEqual(decision, {});
});

const hooksDir = fileURLToPath(
  new URL("../../../.codex/hooks/", import.meta.url),
);

test("Stopエントリポイントが禁止語を拒否する", () => {
  const hookPath = `${hooksDir}reject-words.ts`;
  fs.accessSync(hookPath, fs.constants.X_OK);
  const literal = bannedWords
    .flatMap(({ patterns }) => patterns)
    .find((pattern) => pattern.test(pattern.source));
  assert.ok(literal);
  const { source } = literal;
  const result = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(stop(source)),
    encoding: "utf8",
  });
  assert.equal(result.status, 0);
  const decision: StopDecision = JSON.parse(result.stdout);
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason?.includes(source));
});
