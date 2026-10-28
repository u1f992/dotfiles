import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type {
  Decision,
  PreToolUseDecision,
  StopDecision,
} from "../home/dot_claude/hooks/claude.ts";
import bannedWords from "../home/dot_claude/hooks/banned-words.ts";
import { adapter } from "../home/dot_claude/hooks/claude.ts";
import { rejectWords } from "../home/dot_claude/hooks/policy/reject-words.ts";

// `Decision`はユニオンなので、片方の枝にしかないプロパティは直接読めない。
// 期待したイベントの決定であることをassertしたうえで絞り込む。
const asStopDecision = (decision: Decision): StopDecision => {
  assert.notEqual(decision.hookSpecificOutput?.hookEventName, "PreToolUse");
  return decision as StopDecision;
};
const asPreToolUseDecision = (decision: Decision): PreToolUseDecision => {
  assert.equal(decision.hookSpecificOutput?.hookEventName, "PreToolUse");
  return decision as PreToolUseDecision;
};

// 実ファイルではなく固定のリストを使う。実ファイルの中身が変わってもテストの
// 結果が変わらないようにし、大文字小文字や空白入りの語も含めて照合を確かめる。
const bans = [
  { patterns: [/Foo/i], reason: "Fooを禁じる理由" },
  { patterns: [/bar baz/], reason: "bar bazを禁じる理由" },
];
const bannedUrl = new URL("file:///hooks/banned-words.ts");

const run = (input: unknown, content: unknown = bans) =>
  rejectWords(adapter, input, { url: bannedUrl, content });

const stop = (last_assistant_message: string, stop_hook_active = false) => ({
  stop_hook_active,
  last_assistant_message,
});
const write = (content: string) => ({
  tool_name: "Write",
  tool_input: { file_path: "/x.md", content },
});
const edit = (new_string: string, old_string = "old") => ({
  tool_name: "Edit",
  tool_input: { file_path: "/x.md", old_string, new_string },
});

void test("登録語を含む応答をブロックし、該当語を理由に載せる", () => {
  const decision = asStopDecision(run(stop("これはFooを含む")));
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason?.includes("Foo"));
});

void test("複数該当時はすべて理由に列挙する", () => {
  const { reason } = asStopDecision(run(stop("Foo と bar baz")));
  for (const { patterns } of bans)
    for (const { source } of patterns) assert.ok(reason?.includes(source));
});

// 該当語だけでは何が悪いのか伝わらないので、登録側が書いたreasonを添える。
void test("該当語にreasonを添えて載せる", () => {
  const { reason } = asStopDecision(run(stop("Foo")));
  assert.ok(reason?.includes("/Foo/i: Fooを禁じる理由"));
});

void test("reasonを共有するpatternsのうち該当したものだけを載せる", () => {
  const shared = [{ patterns: [/Foo/, /Bar/], reason: "r" }];
  const only = asStopDecision(run(stop("Foo"), shared));
  assert.ok(only.reason?.includes("/Foo/: r"));
  assert.ok(!only.reason?.includes("/Bar/"));
  const both = asStopDecision(run(stop("Foo Bar"), shared));
  assert.ok(both.reason?.includes("/Foo/, /Bar/: r"));
});

void test("iフラグ付きの登録語は大文字小文字を無視して照合する", () => {
  assert.equal(asStopDecision(run(stop("これはfooを含む"))).decision, "block");
  assert.equal(asStopDecision(run(stop("これはFOOを含む"))).decision, "block");
});

void test("iフラグの無い登録語は大文字小文字を区別する", () => {
  assert.deepEqual(run(stop("BAR BAZ")), {});
});

void test("登録語はパターンとして照合する", () => {
  const decision = asStopDecision(
    run(stop("fo0 bar"), [{ patterns: [/fo[0o] ?bar/], reason: "r" }]),
  );
  assert.equal(decision.decision, "block");
});

void test("登録語が無ければ何も決めない", () => {
  assert.deepEqual(run(stop("hello world")), {});
});

// 禁止語を含んだまま停止される方が困るので、再発火でもブロックを続ける。
// 際限なく続かない根拠はコア側のコメントを参照。
void test("再発火時（stop_hook_active=true）もブロックし続ける", () => {
  assert.equal(asStopDecision(run(stop("Foo", true))).decision, "block");
});

void test("Writeのcontentに登録語を含むとdenyする", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(run(write("冒頭 Foo 末尾")));
  assert.equal(hookSpecificOutput.permissionDecision, "deny");
  assert.ok(hookSpecificOutput.permissionDecisionReason?.includes("Foo"));
});

void test("Editのnew_stringに登録語を含むとdenyする", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(run(edit("冒頭 Foo 末尾")));
  assert.equal(hookSpecificOutput.permissionDecision, "deny");
  assert.ok(hookSpecificOutput.permissionDecisionReason?.includes("Foo"));
});

void test("PreToolUse複数該当時はすべて理由に列挙する", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(
    run(write(bans.flatMap(({ patterns }) => patterns).join(" "))),
  );
  for (const { patterns } of bans)
    for (const { source } of patterns)
      assert.ok(hookSpecificOutput.permissionDecisionReason?.includes(source));
});

void test("Editでold_stringのみに登録語がある場合は何も決めない", () => {
  assert.deepEqual(run(edit("clean", "Foo")), {});
});

void test("Writeで登録語が無ければ何も決めない", () => {
  assert.deepEqual(run(write("hello world")), {});
});

// マッチャは Stop と Write|Edit に限定されており、対象外のツールではフック自体が
// 起動しない。万一起動しても何も決めず素通りさせる。
void test("Write/Edit以外のツールは素通りする", () => {
  assert.deepEqual(run({ tool_name: "Read", tool_input: { file_path: "/x" } }), {});
});

void test("Writeでcontentを欠く入力は素通りする", () => {
  assert.deepEqual(run({ tool_name: "Write", tool_input: { file_path: "/x" } }), {});
});

void test("Editでnew_stringを欠く入力は素通りする", () => {
  assert.deepEqual(
    run({
      tool_name: "Edit",
      tool_input: { file_path: "/x", old_string: "o" },
    }),
    {},
  );
});

void test("どのスキーマにも合致しない入力は素通りする", () => {
  assert.deepEqual(run({ foo: 1 }), {});
});

// 形式不正で止めても直せるのは利用者なので、何も決めずにsystemMessageに載せる。
// ブロックしないことと、どこが形式に合わないかが伝わることの両方を確かめる。
const assertInvalidFormat = (decision: Decision) => {
  assert.equal(decision.hookSpecificOutput, undefined);
  assert.equal(asStopDecision(decision).decision, undefined);
  assert.match(
    decision.systemMessage ?? "",
    /must export default an array of \{ patterns: \[RegExp, \.\.\.RegExp\[\]\], reason: string \}/,
  );
  assert.ok(decision.systemMessage?.includes("/hooks/banned-words.ts"));
};

void test("登録語の一覧が配列でなければ形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), { Foo: true }));
});

void test("string[]の旧形式は形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), ["Foo"]));
});

void test("patternsキーを欠く要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ reason: "" }]));
});

void test("patternsが単一のRegExpの要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ patterns: /Foo/, reason: "" }]));
});

void test("patternsが空の要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ patterns: [], reason: "" }]));
});

void test("patternsに文字列を含む要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ patterns: [/Foo/, "Bar"], reason: "" }]));
});

void test("reasonキーを欠く要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ patterns: [/Foo/] }]));
});

const hooksDir = fileURLToPath(new URL("../home/dot_claude/hooks/", import.meta.url));
const hookPath = `${hooksDir}executable_reject-words.ts`;

void test("配置済みの登録語一覧は{ patterns, reason }の配列になっている", () => {
  const parsed: unknown = bannedWords;
  assert.ok(Array.isArray(parsed));
  for (const entry of parsed) {
    assert.ok(Array.isArray(entry.patterns));
    assert.ok(entry.patterns.length > 0);
    for (const pattern of entry.patterns) assert.ok(pattern instanceof RegExp);
    assert.equal(typeof entry.reason, "string");
  }
});

// Claude Codeはフックをコマンドとして直接起動するので、実行ビットが無いとEACCESで
// 落ちる。コアを直接呼ぶテストではこの不備が現れない。
void test("フックに実行権限がある", () => {
  fs.accessSync(hookPath, fs.constants.X_OK);
});

// エントリポイントが担うのは stdin とファイルの読み込み、stdout への書き出しだけ。
// 判定そのものは上のAPIテストが見るので、ここでは結線だけを確かめる。
void test("エントリポイントはstdinを読んでstdoutに決定を書く", () => {
  const literal = bannedWords
    .flatMap(({ patterns }) => patterns)
    .find((pattern) => pattern.test(pattern.source));
  assert.ok(literal);
  const { source } = literal;
  const res = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(stop(`前 ${source} 後`)),
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  const decision = JSON.parse(res.stdout);
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason.includes(source));
});
