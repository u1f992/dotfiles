#!/usr/bin/env node
import fs from "node:fs";
import { styleText } from "node:util";

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");

type FindBanned = (text: string) => string[];
const loadBanned = (): FindBanned => {
  const bannedPath = new URL("./reject-words.local.json", import.meta.url);
  const banned = JSON.parse(fs.readFileSync(bannedPath, "utf8"));
  if (!isStringArray(banned)) {
    throw new Error(`${bannedPath.pathname} must be a JSON array of strings`);
  }
  return (text) => {
    const lower = text.toLowerCase();
    return banned.filter((word) => lower.includes(word.toLowerCase()));
  };
};

type Dispatch = (x: unknown, findBanned: FindBanned) => boolean;
const dispatch =
  <T>(
    validate: (x: unknown) => x is T,
    select: (x: T) => string,
    handle: (found: readonly string[]) => void,
  ): Dispatch =>
  (x, findBanned) => {
    if (!validate(x)) return false;
    const found = findBanned(select(x));
    if (found.length > 0) handle(found);
    return true;
  };

// stdoutはパイプ（非TTY）なのでvalidateStreamを切って常に着色する。
const red = (text: string): string =>
  styleText("red", text, { validateStream: false });

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

const handleStop = (found: readonly string[]): void => {
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: red(
        `The response contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
      ),
    }),
  );
};

// PreToolUseで書き込みを拒否するときの共通出力。
const denyWrittenText = (found: readonly string[]): void => {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: red(
          `The content to write contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
        ),
      },
    }),
  );
};

/**
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#pretooluse-input
 * latest: https://code.claude.com/docs/en/hooks#pretooluse-input
 */
type WriteToolUseInput = {
  tool_name: "Write";
  tool_input: { content: string };
};
const isWriteToolUseInput = (x: unknown): x is WriteToolUseInput => {
  if (typeof x !== "object" || x === null) return false;
  if (!("tool_name" in x) || x.tool_name !== "Write") return false;
  if (!("tool_input" in x)) return false;
  const { tool_input } = x;
  return (
    typeof tool_input === "object" &&
    tool_input !== null &&
    "content" in tool_input &&
    typeof tool_input.content === "string"
  );
};

type EditToolUseInput = {
  tool_name: "Edit";
  tool_input: { new_string: string };
};
const isEditToolUseInput = (x: unknown): x is EditToolUseInput => {
  if (typeof x !== "object" || x === null) return false;
  if (!("tool_name" in x) || x.tool_name !== "Edit") return false;
  if (!("tool_input" in x)) return false;
  const { tool_input } = x;
  return (
    typeof tool_input === "object" &&
    tool_input !== null &&
    "new_string" in tool_input &&
    typeof tool_input.new_string === "string"
  );
};

const inputJson = fs.readFileSync(0, "utf8");
const input = JSON.parse(inputJson);
const findBanned = loadBanned();
const dispatchers = [
  dispatch(
    isStopHookInput,
    // 自分のブロックでの再発火時は走査対象なし＝ブロックしない（無限ループ防止）
    (x) => (x.stop_hook_active ? "" : x.last_assistant_message),
    handleStop,
  ),
  dispatch(isWriteToolUseInput, (x) => x.tool_input.content, denyWrittenText),
  dispatch(isEditToolUseInput, (x) => x.tool_input.new_string, denyWrittenText),
];
if (!dispatchers.some((run) => run(input, findBanned))) {
  throw new Error("unexpected hook input");
}

process.exit(0);
