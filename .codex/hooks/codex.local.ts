import type { HookAdapter } from "./policy.local/hook-adapter.ts";

/**
 * Codex command-hook wire types used by this repository.
 *
 * Reference: https://learn.chatgpt.com/docs/hooks
 */

type CommonHookInput = {
  session_id: string;
  transcript_path: string | null;
  cwd: string;
  hook_event_name: string;
  model: string;
  permission_mode:
    "default" | "acceptEdits" | "plan" | "dontAsk" | "bypassPermissions";
};

const permissionModes = new Set([
  "default",
  "acceptEdits",
  "plan",
  "dontAsk",
  "bypassPermissions",
]);

const isCommonHookInput = (x: unknown): x is CommonHookInput =>
  typeof x === "object" &&
  x !== null &&
  "session_id" in x &&
  typeof x.session_id === "string" &&
  "transcript_path" in x &&
  (typeof x.transcript_path === "string" || x.transcript_path === null) &&
  "cwd" in x &&
  typeof x.cwd === "string" &&
  "hook_event_name" in x &&
  typeof x.hook_event_name === "string" &&
  "model" in x &&
  typeof x.model === "string" &&
  "permission_mode" in x &&
  typeof x.permission_mode === "string" &&
  permissionModes.has(x.permission_mode);

export type CommonHookOutput = {
  continue?: boolean;
  stopReason?: string;
  systemMessage?: string;
  suppressOutput?: boolean;
};

export type StopHookInput = CommonHookInput & {
  hook_event_name: "Stop";
  turn_id: string;
  stop_hook_active: boolean;
  last_assistant_message: string | null;
};

export const isStopHookInput = (x: unknown): x is StopHookInput =>
  isCommonHookInput(x) &&
  x.hook_event_name === "Stop" &&
  "turn_id" in x &&
  typeof x.turn_id === "string" &&
  "stop_hook_active" in x &&
  typeof x.stop_hook_active === "boolean" &&
  "last_assistant_message" in x &&
  (typeof x.last_assistant_message === "string" ||
    x.last_assistant_message === null);

export type StopHookInputWithMessage = StopHookInput & {
  last_assistant_message: string;
};

export const isStopHookInputWithMessage = (
  x: unknown,
): x is StopHookInputWithMessage =>
  isStopHookInput(x) && typeof x.last_assistant_message === "string";

export type StopDecision =
  | (CommonHookOutput & {
      decision?: never;
      reason?: never;
    })
  | (CommonHookOutput & {
      decision: "block";
      reason: string;
    });

export type ApplyPatchToolUseInput = CommonHookInput & {
  hook_event_name: "PreToolUse";
  turn_id: string;
  tool_name: "apply_patch";
  tool_use_id: string;
  tool_input: { command: string };
};

export const isApplyPatchToolUseInput = (
  x: unknown,
): x is ApplyPatchToolUseInput => {
  if (!isCommonHookInput(x) || x.hook_event_name !== "PreToolUse") return false;
  if (!("turn_id" in x) || typeof x.turn_id !== "string") return false;
  if (!("tool_use_id" in x) || typeof x.tool_use_id !== "string") return false;
  if (!("tool_name" in x) || x.tool_name !== "apply_patch") return false;
  if (!("tool_input" in x)) return false;
  const { tool_input } = x;
  return (
    typeof tool_input === "object" &&
    tool_input !== null &&
    "command" in tool_input &&
    typeof tool_input.command === "string"
  );
};

export const extractAddedContent = (command: string): string =>
  command
    .split(/\r?\n/)
    .filter((line) => line.startsWith("+"))
    .map((line) => line.slice(1))
    .join("\n");

export type PreToolUseDecision =
  | { systemMessage?: string; hookSpecificOutput?: never }
  | {
      systemMessage?: string;
      hookSpecificOutput: {
        hookEventName: "PreToolUse";
        permissionDecision: "allow" | "deny" | "ask" | "defer";
        permissionDecisionReason?: string;
        updatedInput?: Record<string, unknown>;
        additionalContext?: string;
      };
    };

export type Decision = StopDecision | PreToolUseDecision;

const mergeStopDecisions = (
  decisions: readonly StopDecision[],
): StopDecision => {
  const reasons = decisions.flatMap((decision) =>
    decision.decision === "block" ? [decision.reason] : [],
  );
  const warnings = decisions.flatMap(({ systemMessage }) =>
    systemMessage === undefined ? [] : [systemMessage],
  );
  const systemMessage = warnings.join("\n");
  if (reasons.length > 0) {
    const blocked: StopDecision = {
      decision: "block",
      reason: reasons.join("\n\n"),
    };
    return systemMessage === "" ? blocked : { ...blocked, systemMessage };
  }
  return systemMessage === "" ? {} : { systemMessage };
};

export const adapter: HookAdapter<Decision, StopDecision> = {
  allow: () => ({}),
  warn: (systemMessage) => ({ systemMessage }),
  stop: {
    matches: isStopHookInput,
    message: (input) =>
      isStopHookInputWithMessage(input)
        ? input.last_assistant_message
        : undefined,
    allow: () => ({}),
    warn: (systemMessage) => ({ systemMessage }),
    block: (reason) => ({ decision: "block", reason }),
    merge: mergeStopDecisions,
  },
  edits: [
    {
      content: (input) =>
        isApplyPatchToolUseInput(input)
          ? extractAddedContent(input.tool_input.command)
          : undefined,
      deny: (permissionDecisionReason) => ({
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason,
        },
      }),
    },
  ],
};
