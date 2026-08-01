import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

import { requireTasks } from "../../../.claude/hooks/core.local/require-tasks.ts";

const tasksUrl = new URL("file:///hooks/require-tasks.local.json");

const stop = { stop_hook_active: false, last_assistant_message: "done" };

// 着色はエントリポイントの持ち物なので、コアには印を渡して適用の有無だけを見る。
const styleDeny = (text: string) => `<deny>${text}</deny>`;

const run = (taskList: unknown, input: unknown = stop) =>
  requireTasks(input, { url: tasksUrl, content: taskList }, styleDeny);

const tasks = (...entries: { done: boolean; task: string }[]) => entries;

test("未完了のタスクがあればブロックし、理由に列挙する", () => {
  const decision = run(
    tasks({ done: false, task: "書く" }, { done: false, task: "直す" }),
  );
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason?.includes("書く"));
  assert.ok(decision.reason?.includes("直す"));
});

test("完了済みのタスクは理由に載せず、件数にも数えない", () => {
  const { reason } = run(
    tasks({ done: true, task: "済んだ" }, { done: false, task: "残り" }),
  );
  assert.ok(reason?.includes("残り"));
  assert.ok(!reason?.includes("済んだ"));
  assert.match(reason ?? "", /1 open task\(s\)/);
});

test("理由に読み込み元のパスを載せる", () => {
  const { reason } = run(tasks({ done: false, task: "書く" }));
  assert.ok(reason?.includes("/hooks/require-tasks.local.json"));
});

// 許可も決定のひとつ。`decision`を持たないJSONが停止を許すので`{}`になる。
test("すべて完了していればブロックしない", () => {
  assert.deepEqual(run(tasks({ done: true, task: "済んだ" })), {});
});

test("空配列ならブロックしない", () => {
  assert.deepEqual(run([]), {});
});

// 未完了のタスクを残したまま停止される方が困るので、再発火でもブロックを続ける。
// 際限なく続かない根拠はコア側のコメントを参照。
test("再発火時（stop_hook_active=true）もブロックし続ける", () => {
  const decision = run(tasks({ done: false, task: "書く" }), {
    stop_hook_active: true,
    last_assistant_message: "done",
  });
  assert.equal(decision.decision, "block");
  assert.ok(decision.reason?.includes("書く"));
});

// Stop 以外では発火しない設定を前提にしつつ、万一届いても素通りさせる。
test("Stop以外の入力は許可を返す", () => {
  assert.deepEqual(
    run(tasks({ done: false, task: "書く" }), {
      tool_name: "Write",
      tool_input: { file_path: "/x.md", content: "hello" },
    }),
    {},
  );
});

test("理由はstyleDenyを通す", () => {
  const { reason } = run(tasks({ done: false, task: "書く" }));
  assert.ok(reason?.startsWith("<deny>"));
  assert.ok(reason?.endsWith("</deny>"));
});

// 診断はstyleDenyを通さない。拒否ではなく設定ファイルの不備の通知なので、
// 装飾の対象が違う。
test("systemMessageはstyleDenyを通さない", () => {
  const { systemMessage } = run(["書く"]);
  assert.ok(!systemMessage?.includes("<deny>"));
});

// 形式不正で停止を止めても直せるのは利用者なので、許可したうえでsystemMessageに
// 載せる。ブロックしないことと、何が壊れているか伝わることの両方を確かめる。
const assertInvalidFormat = (decision: ReturnType<typeof run>) => {
  assert.equal(decision.decision, undefined);
  assert.equal(decision.hookSpecificOutput, undefined);
  assert.match(
    decision.systemMessage ?? "",
    /must be a JSON array of \{ done: boolean, task: string \}/,
  );
  assert.ok(
    decision.systemMessage?.includes("/hooks/require-tasks.local.json"),
  );
};

test("string[]の旧形式は許可して形式の誤りを知らせる", () => {
  assertInvalidFormat(run(["書く"]));
});

test("taskキーを欠く要素は許可して形式の誤りを知らせる", () => {
  assertInvalidFormat(run([{ done: false }]));
});

test("doneが真偽値でない要素は許可して形式の誤りを知らせる", () => {
  assertInvalidFormat(run([{ done: "yes", task: "書く" }]));
});

test("配列でないJSONは許可して形式の誤りを知らせる", () => {
  assertInvalidFormat(run({ done: false, task: "書く" }));
});

const hooksDir = fileURLToPath(
  new URL("../../../.claude/hooks/", import.meta.url),
);
const hookPath = `${hooksDir}require-tasks.local.ts`;

// 入力ファイルは常に存在する前提なので、実ファイルの形式そのものを検証する。
// 中身は作業状態なので、未完了が残っているかどうかは検査しない。
test("配置済みの入力ファイルは形式が正しい", () => {
  const raw = fs.readFileSync(`${hooksDir}require-tasks.local.json`, "utf8");
  const parsed: unknown = JSON.parse(raw);
  assert.ok(Array.isArray(parsed));
  for (const entry of parsed) {
    assert.equal(typeof entry.done, "boolean");
    assert.equal(typeof entry.task, "string");
    assert.ok(entry.task.length > 0);
  }
});

// Claude Codeはフックをコマンドとして直接起動するので、実行ビットが無いとEACCESで
// 落ちる。コアを直接呼ぶテストではこの不備が現れない。
test("フックに実行権限がある", () => {
  fs.accessSync(hookPath, fs.constants.X_OK);
});

// エントリポイントが担うのは stdin とファイルの読み込み、stdout への書き出しだけ。
// 判定そのものは上のAPIテストが見るので、ここでは結線だけを確かめる。実ファイルは
// 作業状態なので、決定の中身ではなくJSONとして出ることだけを確かめる。
test("エントリポイントはstdinを読んでstdoutに決定を書く", () => {
  const res = spawnSync(process.execPath, [hookPath], {
    input: JSON.stringify(stop),
    encoding: "utf8",
  });
  assert.equal(res.status, 0);
  assert.equal(typeof JSON.parse(res.stdout), "object");
});
