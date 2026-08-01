import assert from "node:assert/strict";
import { test } from "node:test";

import {
  isEditToolUseInput,
  isStopHookInput,
  isWriteToolUseInput,
  type PreToolUseDecision,
  type StopDecision,
} from "../../../.claude/hooks/core.local/claude.ts";

// Stopの決定にファクトリは無く、プレーンなオブジェクトを型で検査する。
// `satisfies`はnpm run typecheckで検査され、実行時アサーションは出力の形を示す。
// blockはフックエラー、additionalContextはStop hook feedbackとして表示される。
// 許可は`decision`を持たないJSON、つまり`{}`。
const stopDecisions = {
  block: {
    decision: "block",
    reason: "続けて",
  },
  blockWithMessage: {
    systemMessage: "注意",
    decision: "block",
    reason: "続けて",
  },
  feedback: {
    hookSpecificOutput: {
      hookEventName: "Stop",
      additionalContext: "テストを流して",
    },
  },
  feedbackWithCommonField: {
    continue: false,
    hookSpecificOutput: { hookEventName: "Stop", additionalContext: "文脈" },
  },
  allow: {},
  allowWithMessage: { systemMessage: "注意" },
} satisfies Record<string, StopDecision>;

test("Stopの決定はそのままJSONの形になる", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(stopDecisions)), {
    block: { decision: "block", reason: "続けて" },
    blockWithMessage: {
      systemMessage: "注意",
      decision: "block",
      reason: "続けて",
    },
    feedback: {
      hookSpecificOutput: {
        hookEventName: "Stop",
        additionalContext: "テストを流して",
      },
    },
    feedbackWithCommonField: {
      continue: false,
      hookSpecificOutput: { hookEventName: "Stop", additionalContext: "文脈" },
    },
    allow: {},
    allowWithMessage: { systemMessage: "注意" },
  });
});

// PreToolUseもファクトリを持たず、プレーンなオブジェクトを型で検査する。
// 共通フィールドはhookSpecificOutputの中ではなくトップレベルに置く。
const preToolUseDecisions = {
  deny: {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    },
  },
  allowWithEveryField: {
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "allow",
      permissionDecisionReason: "理由",
      updatedInput: { command: "npm run lint" },
      additionalContext: "文脈",
    },
  },
  denyWithCommonFields: {
    continue: false,
    stopReason: "中止",
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
    },
  },
} satisfies Record<string, PreToolUseDecision>;

test("PreToolUseの決定はそのままJSONの形になる", () => {
  assert.deepEqual(JSON.parse(JSON.stringify(preToolUseDecisions)), {
    deny: {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
      },
    },
    allowWithEveryField: {
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "allow",
        permissionDecisionReason: "理由",
        updatedInput: { command: "npm run lint" },
        additionalContext: "文脈",
      },
    },
    denyWithCommonFields: {
      continue: false,
      stopReason: "中止",
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
      },
    },
  });
});

test("isStopHookInputはStopの入力だけを受け入れる", () => {
  assert.ok(
    isStopHookInput({ stop_hook_active: false, last_assistant_message: "x" }),
  );
  assert.ok(!isStopHookInput({ stop_hook_active: false }));
  assert.ok(!isStopHookInput({ last_assistant_message: "x" }));
  assert.ok(
    !isStopHookInput({ stop_hook_active: "no", last_assistant_message: "x" }),
  );
  assert.ok(!isStopHookInput(null));
  assert.ok(!isStopHookInput("stop"));
});

test("isWriteToolUseInputはWriteの入力だけを受け入れる", () => {
  assert.ok(
    isWriteToolUseInput({ tool_name: "Write", tool_input: { content: "x" } }),
  );
  assert.ok(
    !isWriteToolUseInput({ tool_name: "Edit", tool_input: { content: "x" } }),
  );
  assert.ok(!isWriteToolUseInput({ tool_name: "Write", tool_input: {} }));
  assert.ok(!isWriteToolUseInput({ tool_name: "Write" }));
  assert.ok(!isWriteToolUseInput(null));
});

test("isEditToolUseInputはEditの入力だけを受け入れる", () => {
  assert.ok(
    isEditToolUseInput({ tool_name: "Edit", tool_input: { new_string: "x" } }),
  );
  assert.ok(
    !isEditToolUseInput({
      tool_name: "Write",
      tool_input: { new_string: "x" },
    }),
  );
  assert.ok(
    !isEditToolUseInput({ tool_name: "Edit", tool_input: { content: "x" } }),
  );
  assert.ok(!isEditToolUseInput(null));
});
