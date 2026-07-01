#!/usr/bin/env node
import fs from "node:fs";
import { styleText } from "node:util";

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");

type FindBanned = (text: string) => string[];

type Dispatch = (x: unknown, findBanned: FindBanned) => boolean;
const dispatch =
  <T>(entry: {
    validate: (x: unknown) => x is T;
    handle: (x: T, findBanned: FindBanned) => void;
  }): Dispatch =>
  (x, findBanned) => {
    if (!entry.validate(x)) return false;
    entry.handle(x, findBanned);
    return true;
  };

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

const handleStop = (input: StopHookInput, findBanned: FindBanned): void => {
  // 自分のブロックで再発火した場合はブロックしない（無限ループ防止）
  if (input.stop_hook_active) {
    return;
  }
  const found = findBanned(input.last_assistant_message);
  if (found.length > 0) {
    process.stdout.write(
      JSON.stringify({
        decision: "block",
        reason: red(
          `The response contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
        ),
      }),
    );
  }
};

// PreToolUseで書き込みを拒否するときの共通出力。
const denyWrittenText = (text: string, findBanned: FindBanned): void => {
  const found = findBanned(text);
  if (found.length > 0) {
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
  }
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
const handleWrite = (
  input: WriteToolUseInput,
  findBanned: FindBanned,
): void => {
  denyWrittenText(input.tool_input.content, findBanned);
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
const handleEdit = (input: EditToolUseInput, findBanned: FindBanned): void => {
  denyWrittenText(input.tool_input.new_string, findBanned);
};

const inputJson = fs.readFileSync(0, "utf8");
const input = JSON.parse(inputJson);
const findBanned = loadBanned();
const dispatchers: Dispatch[] = [
  dispatch({ validate: isStopHookInput, handle: handleStop }),
  dispatch({ validate: isWriteToolUseInput, handle: handleWrite }),
  dispatch({ validate: isEditToolUseInput, handle: handleEdit }),
];
if (!dispatchers.some((run) => run(input, findBanned))) {
  throw new Error("unexpected hook input");
}

process.exit(0);
