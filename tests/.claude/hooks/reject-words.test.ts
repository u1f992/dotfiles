import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const hookPath = fileURLToPath(
  new URL("../../../.claude/hooks/reject-words.local.ts", import.meta.url),
);
const bannedPath = new URL(
  "../../../.claude/hooks/reject-words.local.json",
  import.meta.url,
);
const banned: string[] = JSON.parse(fs.readFileSync(bannedPath, "utf8"));

const run = (input: unknown) =>
  spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(input),
    encoding: "utf8",
  });

test("登録語を含む応答をブロックし、該当語を理由に載せる", () => {
  const [word] = banned;
  assert.ok(word, "banned fixture は空でないこと");
  const res = run({
    stop_hook_active: false,
    last_assistant_message: `これは${word}を含む`,
  });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.decision, "block");
  assert.ok(out.reason.includes(word));
});

test("複数該当時はすべて理由に列挙する", () => {
  const res = run({
    stop_hook_active: false,
    last_assistant_message: banned.join(" "),
  });
  const out = JSON.parse(res.stdout);
  for (const word of banned) assert.ok(out.reason.includes(word));
});

test("登録語が無ければブロックしない", () => {
  const res = run({
    stop_hook_active: false,
    last_assistant_message: "hello world",
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("再発火時（stop_hook_active=true）はブロックしない", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({ stop_hook_active: true, last_assistant_message: word });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("Writeのcontentに登録語を含むとdenyする", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({
    tool_name: "Write",
    tool_input: { file_path: "/x.md", content: `冒頭 ${word} 末尾` },
  });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.hookSpecificOutput.hookEventName, "PreToolUse");
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.ok(out.hookSpecificOutput.permissionDecisionReason.includes(word));
});

test("Editのnew_stringに登録語を含むとdenyする", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({
    tool_name: "Edit",
    tool_input: {
      file_path: "/x.md",
      old_string: "old",
      new_string: `冒頭 ${word} 末尾`,
    },
  });
  assert.equal(res.status, 0);
  const out = JSON.parse(res.stdout);
  assert.equal(out.hookSpecificOutput.permissionDecision, "deny");
  assert.ok(out.hookSpecificOutput.permissionDecisionReason.includes(word));
});

test("PreToolUse複数該当時はすべて理由に列挙する", () => {
  const res = run({
    tool_name: "Write",
    tool_input: { file_path: "/x.md", content: banned.join(" ") },
  });
  const out = JSON.parse(res.stdout);
  for (const word of banned)
    assert.ok(out.hookSpecificOutput.permissionDecisionReason.includes(word));
});

test("Editでold_stringのみに登録語がある場合はブロックしない", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({
    tool_name: "Edit",
    tool_input: { file_path: "/x.md", old_string: word, new_string: "clean" },
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("Writeで登録語が無ければdenyしない", () => {
  const res = run({
    tool_name: "Write",
    tool_input: { file_path: "/x.md", content: "hello world" },
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("Write/Edit以外のツールは素通しする（何も出力しない）", () => {
  const res = run({
    tool_name: "Read",
    tool_input: { file_path: "/x.md" },
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("対象外ツールの入力に登録語が含まれても素通しする", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({
    tool_name: "Bash",
    tool_input: { command: `echo ${word}` },
  });
  assert.equal(res.status, 0);
  assert.equal(res.stdout, "");
});

test("Writeでcontentを欠く入力はバリデーションエラーになる", () => {
  const res = run({
    tool_name: "Write",
    tool_input: { file_path: "/x.md" },
  });
  assert.equal(res.status, 1);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /unexpected hook input/);
});

test("Editでnew_stringを欠く入力はバリデーションエラーになる", () => {
  const res = run({
    tool_name: "Edit",
    tool_input: { file_path: "/x.md", old_string: "old" },
  });
  assert.equal(res.status, 1);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /unexpected hook input/);
});

test("Stopの理由は赤色で装飾する", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({ stop_hook_active: false, last_assistant_message: word });
  const out = JSON.parse(res.stdout);
  assert.ok(out.reason.includes("\x1b[31m"));
  assert.ok(out.reason.includes("\x1b[39m"));
});

test("PreToolUseの理由は赤色（ANSI）で装飾する", () => {
  const [word] = banned;
  assert.ok(word);
  const res = run({
    tool_name: "Write",
    tool_input: { file_path: "/x.md", content: word },
  });
  const { permissionDecisionReason } = JSON.parse(
    res.stdout,
  ).hookSpecificOutput;
  assert.ok(permissionDecisionReason.includes("\x1b[31m"));
  assert.ok(permissionDecisionReason.includes("\x1b[39m"));
});

test("どのスキーマにも合致しない入力はthrowする", () => {
  const res = run({ foo: 1 });
  assert.equal(res.status, 1);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /unexpected hook input/);
});
