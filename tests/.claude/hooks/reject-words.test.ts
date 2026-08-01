import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import type {
  Decision,
  PreToolUseDecision,
  StopDecision,
} from "../../../.claude/hooks/core.local/claude.ts";
import { rejectWords } from "../../../.claude/hooks/core.local/reject-words.ts";

// `Decision`はユニオンなので、片方の枝にしかないプロパティは直接読めない。
// 期待したイベントの決定が返っていることをassertしたうえで絞り込む。
const asStopDecision = (decision: Decision): StopDecision => {
  assert.notEqual(decision.hookSpecificOutput?.hookEventName, "PreToolUse");
  return decision as StopDecision;
};
const asPreToolUseDecision = (decision: Decision): PreToolUseDecision => {
  assert.equal(decision.hookSpecificOutput?.hookEventName, "PreToolUse");
  return decision as PreToolUseDecision;
};

// 実ファイルではなく固定のリストを使う。実ファイルの中身が変わってもテストが
// 揺れないようにし、大文字小文字や空白入りの語も含めて照合を確かめる。
const banned = [
  { word: "Foo", reason: "Fooを禁じる理由" },
  { word: "bar baz", reason: "bar bazを禁じる理由" },
];
const bannedUrl = new URL("file:///hooks/reject-words.local.json");

// 着色はエントリポイントの持ち物なので、コアには印を渡して適用の有無だけを見る。
const styleDeny = (text: string) => `<deny>${text}</deny>`;

const run = (input: unknown, words: unknown = banned) =>
  rejectWords(input, { url: bannedUrl, content: words }, styleDeny);

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

test("登録語を含む応答をブロックし、該当語を理由に載せる", () => {
  const decision = asStopDecision(run(stop("これはFooを含む")));
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason?.includes("Foo"));
});

test("複数該当時はすべて理由に列挙する", () => {
  const { reason } = asStopDecision(run(stop("Foo と bar baz")));
  for (const { word } of banned) assert.ok(reason?.includes(word));
});

// 該当語だけでは何が悪いのか伝わらないので、登録側が書いたreasonを添える。
test("該当語にreasonを添えて載せる", () => {
  const { reason } = asStopDecision(run(stop("Foo")));
  assert.ok(reason?.includes("Foo: Fooを禁じる理由"));
});

// 語の言い換えで済むという誤読を招かないよう、禁止の対象が語ではなくフレーミングで
// あることを拒否のたびに載せる。Stop と PreToolUse のどちらでも欠かせない。
test("拒否の理由に言い換えでは直らない旨を載せる", () => {
  const { reason } = asStopDecision(run(stop("Foo")));
  assert.ok(reason?.includes("Substituting synonyms"));
  const { hookSpecificOutput } = asPreToolUseDecision(run(write("Foo")));
  assert.ok(
    hookSpecificOutput.permissionDecisionReason?.includes(
      "Substituting synonyms",
    ),
  );
});

test("大文字小文字を無視して照合する", () => {
  assert.equal(asStopDecision(run(stop("これはfooを含む"))).decision, "block");
  assert.equal(asStopDecision(run(stop("これはFOOを含む"))).decision, "block");
});

test("登録語が無ければ何も決めない", () => {
  assert.deepEqual(run(stop("hello world")), {});
});

// 禁止語を含んだまま停止される方が困るので、再発火でもブロックを続ける。
// 際限なく続かない根拠はコア側のコメントを参照。
test("再発火時（stop_hook_active=true）もブロックし続ける", () => {
  assert.equal(asStopDecision(run(stop("Foo", true))).decision, "block");
});

test("Writeのcontentに登録語を含むとdenyする", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(
    run(write("冒頭 Foo 末尾")),
  );
  assert.equal(hookSpecificOutput.permissionDecision, "deny");
  assert.ok(hookSpecificOutput.permissionDecisionReason?.includes("Foo"));
});

test("Editのnew_stringに登録語を含むとdenyする", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(
    run(edit("冒頭 Foo 末尾")),
  );
  assert.equal(hookSpecificOutput.permissionDecision, "deny");
  assert.ok(hookSpecificOutput.permissionDecisionReason?.includes("Foo"));
});

test("PreToolUse複数該当時はすべて理由に列挙する", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(
    run(write(banned.map(({ word }) => word).join(" "))),
  );
  for (const { word } of banned)
    assert.ok(hookSpecificOutput.permissionDecisionReason?.includes(word));
});

test("Editでold_stringのみに登録語がある場合は何も決めない", () => {
  assert.deepEqual(run(edit("clean", "Foo")), {});
});

test("Writeで登録語が無ければ何も決めない", () => {
  assert.deepEqual(run(write("hello world")), {});
});

// マッチャは Stop と Write|Edit に限定されており、対象外はそもそも届かない。
// 万一届いても何も決めず素通りさせる。
test("Write/Edit以外のツールは素通りする", () => {
  assert.deepEqual(
    run({ tool_name: "Read", tool_input: { file_path: "/x" } }),
    {},
  );
});

test("Writeでcontentを欠く入力は素通りする", () => {
  assert.deepEqual(
    run({ tool_name: "Write", tool_input: { file_path: "/x" } }),
    {},
  );
});

test("Editでnew_stringを欠く入力は素通りする", () => {
  assert.deepEqual(
    run({
      tool_name: "Edit",
      tool_input: { file_path: "/x", old_string: "o" },
    }),
    {},
  );
});

test("どのスキーマにも合致しない入力は素通りする", () => {
  assert.deepEqual(run({ foo: 1 }), {});
});

test("Stopの理由はstyleDenyを通す", () => {
  const { reason } = asStopDecision(run(stop("Foo")));
  assert.ok(reason?.startsWith("<deny>"));
  assert.ok(reason?.endsWith("</deny>"));
});

test("PreToolUseの理由はstyleDenyを通す", () => {
  const { hookSpecificOutput } = asPreToolUseDecision(run(write("Foo")));
  const { permissionDecisionReason } = hookSpecificOutput;
  assert.ok(permissionDecisionReason?.startsWith("<deny>"));
  assert.ok(permissionDecisionReason?.endsWith("</deny>"));
});

// 診断はstyleDenyを通さない。拒否ではなく設定ファイルの不備の通知なので、
// 装飾の対象が違う。
test("systemMessageはstyleDenyを通さない", () => {
  const decision = run(stop("hello"), { Foo: true });
  assert.ok(!decision.systemMessage?.includes("<deny>"));
});

// 形式不正で止めても直せるのは利用者なので、何も決めずにsystemMessageに載せる。
// ブロックしないことと、何が壊れているか伝わることの両方を確かめる。
const assertInvalidFormat = (decision: Decision) => {
  assert.equal(decision.hookSpecificOutput, undefined);
  assert.equal(asStopDecision(decision).decision, undefined);
  assert.match(
    decision.systemMessage ?? "",
    /must be a JSON array of \{ word: string, reason: string \}/,
  );
  assert.ok(decision.systemMessage?.includes("/hooks/reject-words.local.json"));
};

test("登録語の一覧が配列でなければ形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), { Foo: true }));
});

test("string[]の旧形式は形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), ["Foo"]));
});

test("wordキーを欠く要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ reason: "" }]));
});

test("reasonキーを欠く要素があれば形式の誤りを知らせる", () => {
  assertInvalidFormat(run(stop("hello"), [{ word: "Foo" }]));
});

const hooksDir = fileURLToPath(
  new URL("../../../.claude/hooks/", import.meta.url),
);
const hookPath = `${hooksDir}reject-words.local.ts`;

test("配置済みの登録語一覧は{ word, reason }の配列になっている", () => {
  const raw = fs.readFileSync(`${hooksDir}reject-words.local.json`, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assert.ok(Array.isArray(parsed));
  for (const entry of parsed) {
    assert.equal(typeof entry.word, "string");
    assert.ok(entry.word.length > 0);
    assert.equal(typeof entry.reason, "string");
  }
});

// Claude Codeはフックをコマンドとして直接起動するので、実行ビットが無いとEACCESで
// 落ちる。コアを直接呼ぶテストではこの不備が現れない。
test("フックに実行権限がある", () => {
  fs.accessSync(hookPath, fs.constants.X_OK);
});

// エントリポイントが担うのは stdin とファイルの読み込み、stdout への書き出しだけ。
// 判定そのものは上のAPIテストが見るので、ここでは結線だけを確かめる。
test("エントリポイントはstdinを読んでstdoutに決定を書く", () => {
  const realBanned: { word: string; reason: string }[] = JSON.parse(
    fs.readFileSync(`${hooksDir}reject-words.local.json`, "utf8"),
  );
  const [entry] = realBanned;
  assert.ok(entry);
  const { word } = entry;
  const res = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(stop(`前 ${word} 後`)),
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  const decision = JSON.parse(res.stdout);
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason.includes(word));
  // 着色を渡しているのはエントリポイントなので、ANSIはここでしか確かめられない。
  assert.ok(decision.reason.includes("\x1b[31m"));
  assert.ok(decision.reason.includes("\x1b[39m"));
});
