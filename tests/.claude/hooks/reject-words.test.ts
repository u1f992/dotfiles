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

test("Stop スキーマに合致しない入力は throw する", () => {
  const res = run({ foo: 1 });
  assert.equal(res.status, 1);
  assert.equal(res.stdout, "");
  assert.match(res.stderr, /unexpected Stop hook input/);
});
