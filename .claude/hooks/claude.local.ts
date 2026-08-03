import type { HookAdapter } from "./policy.local/hook-adapter.ts";

/**
 * イベントを問わず解釈される共通フィールド。イベント固有の決定と同じJSONに載る。
 *
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#json-output
 * latest: https://code.claude.com/docs/en/hooks#json-output
 */
export type HookOutput = {
  continue?: boolean;
  stopReason?: string;
  suppressOutput?: boolean;
  systemMessage?: string;
  terminalSequence?: string;
};

/**
 * top-levelの`decision`で止めるパターン。UserPromptSubmit, UserPromptExpansion,
 * PostToolUse, PostToolUseFailure, PostToolBatch, Stop, SubagentStop,
 * ConfigChange, PreCompactが共有する。`"block"`が唯一の値で`reason`が必須。
 * 許可する場合はJSONを出さずにexit 0とする。
 *
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#decision-control
 * latest: https://code.claude.com/docs/en/hooks#decision-control
 */
export type BlockDecision = HookOutput & {
  decision: "block";
  reason: string;
};

/**
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#stop-input
 * latest: https://code.claude.com/docs/en/hooks#stop-input
 */
export type StopHookInput = {
  stop_hook_active: boolean;
  last_assistant_message: string;
};
export const isStopHookInput = (x: unknown): x is StopHookInput =>
  typeof x === "object" &&
  x !== null &&
  "stop_hook_active" in x &&
  typeof x.stop_hook_active === "boolean" &&
  "last_assistant_message" in x &&
  typeof x.last_assistant_message === "string";

/**
 * Stopが返せる決定は3通り。`decision: "block"`はフックエラーとして表示され、
 * `hookSpecificOutput.additionalContext`はStop hook feedbackとして表示される。
 * どちらも会話を継続させ、stop_hook_activeと連続8回の上限という同じ保護を受ける。
 * 停止を許す場合は`decision`を持たないJSON、つまり`{}`でよい。
 *
 * 各枝の`?: never`は他の枝のキーを塞ぐためのもの。これが無いと、ユニオンに対する
 * 余剰プロパティ検査が「どれかの枝にあるキー」を通してしまい、blockとfeedbackを
 * 混ぜたオブジェクトが素通りする。
 *
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#stop-decision-control
 * latest: https://code.claude.com/docs/en/hooks#stop-decision-control
 */
export type StopDecision =
  | (BlockDecision & { hookSpecificOutput?: never })
  | (HookOutput & {
      decision?: never;
      reason?: never;
      hookSpecificOutput: { hookEventName: "Stop"; additionalContext: string };
    })
  | (HookOutput & {
      decision?: never;
      reason?: never;
      hookSpecificOutput?: never;
    });

/**
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#pretooluse-input
 * latest: https://code.claude.com/docs/en/hooks#pretooluse-input
 */
export type WriteToolUseInput = {
  tool_name: "Write";
  tool_input: { content: string };
};
export const isWriteToolUseInput = (x: unknown): x is WriteToolUseInput => {
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

export type EditToolUseInput = {
  tool_name: "Edit";
  tool_input: { new_string: string };
};
export const isEditToolUseInput = (x: unknown): x is EditToolUseInput => {
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

/**
 * PreToolUseだけは`hookSpecificOutput`で許可・拒否を返す（top-levelの
 * `decision`/`reason`はこのイベントでは非推奨）。`permissionDecisionReason`が
 * Claudeに渡るのは`"deny"`のときだけで、`"allow"`と`"ask"`ではユーザーにのみ
 * 表示され、`"defer"`では無視される。
 *
 * snapshot: https://github.com/ericbuess/claude-code-docs/blob/67a17da1fb3273ebe392a1a5d7075fa3df2d711b/docs/hooks.md#pretooluse-decision-control
 * latest: https://code.claude.com/docs/en/hooks#pretooluse-decision-control
 */
export type PreToolUseDecision = HookOutput & {
  hookSpecificOutput: {
    hookEventName: "PreToolUse";
    permissionDecision: "allow" | "deny" | "ask" | "defer";
    permissionDecisionReason?: string;
    updatedInput?: Record<string, unknown>;
    additionalContext?: string;
  };
};

export type Decision = StopDecision | PreToolUseDecision;

const denyEdit = (reason: string): PreToolUseDecision => ({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: reason,
  },
});

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
      isStopHookInput(input) ? input.last_assistant_message : undefined,
    allow: () => ({}),
    warn: (systemMessage) => ({ systemMessage }),
    block: (reason) => ({ decision: "block", reason }),
    merge: mergeStopDecisions,
  },
  edits: [
    {
      content: (input) =>
        isWriteToolUseInput(input) ? input.tool_input.content : undefined,
      deny: denyEdit,
    },
    {
      content: (input) =>
        isEditToolUseInput(input) ? input.tool_input.new_string : undefined,
      deny: denyEdit,
    },
  ],
};
