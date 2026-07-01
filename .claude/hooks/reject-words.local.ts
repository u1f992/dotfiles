#!/usr/bin/env node
import fs from "node:fs";
import { styleText } from "node:util";

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");

type FindBanned = (text: string) => string[];
const loadBanned = (bannedPath: URL): FindBanned => {
  const bannedJson = fs.readFileSync(bannedPath, "utf8");
  const banned = JSON.parse(bannedJson);
  if (!isStringArray(banned)) {
    throw new Error(`${bannedPath.pathname} must be a JSON array of strings`);
  }
  return (text) => {
    const lower = text.toLowerCase();
    return banned.filter((word) => lower.includes(word.toLowerCase()));
  };
};

type Route = (x: unknown, findBanned: FindBanned) => boolean;
const route =
  <T>(
    validate: (x: unknown) => x is T,
    select: (x: T) => string,
    handle: (found: readonly string[], x: T) => void,
  ): Route =>
  (x, findBanned) => {
    if (!validate(x)) return false;
    const found = findBanned(select(x));
    if (found.length > 0) handle(found, x);
    return true;
  };

const createDispatch =
  (findBanned: FindBanned, routes: Route[]) =>
  (x: unknown): boolean =>
    routes.some((r) => r(x, findBanned));

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

const handleStop = (found: readonly string[], input: StopHookInput): void => {
  // 自分のブロックで再発火した場合はブロックしない（無限ループ防止）
  if (input.stop_hook_active) return;
  process.stdout.write(
    JSON.stringify({
      decision: "block",
      reason: red(
        `The response contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
      ),
    }),
  );
};

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
const bannedPath = new URL("./reject-words.local.json", import.meta.url);
const findBanned = loadBanned(bannedPath);
const dispatch = createDispatch(findBanned, [
  route(isStopHookInput, (x) => x.last_assistant_message, handleStop),
  route(isWriteToolUseInput, (x) => x.tool_input.content, denyWrittenText),
  route(isEditToolUseInput, (x) => x.tool_input.new_string, denyWrittenText),
]);
if (!dispatch(input)) {
  throw new Error("unexpected hook input");
}
