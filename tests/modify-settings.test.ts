import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test, type TestContext } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(
  new URL("../home/dot_claude/modify_settings.json.ts", import.meta.url),
);

const makeHome = (t: TestContext, existing?: string) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "modify-settings-"));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  fs.mkdirSync(path.join(home, ".claude"));
  if (existing !== undefined)
    fs.writeFileSync(path.join(home, ".claude", "settings.json"), existing);
  return home;
};

const run = (home: string, input: string, command?: string) => {
  const env: NodeJS.ProcessEnv = { ...process.env, CHEZMOI_DEST_DIR: home };
  delete env.CHEZMOI_COMMAND;
  if (command !== undefined) env.CHEZMOI_COMMAND = command;
  const result = spawnSync(process.execPath, [script], { input, encoding: "utf8", env });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
};

const parse = (output: string): Record<string, any> => JSON.parse(output);

const backups = (home: string) =>
  fs
    .readdirSync(path.join(home, ".claude"))
    .filter((name) => name.endsWith(".orig"))
    .sort();

void test("既存ファイルが無ければ管理対象の設定だけを出力し、origを残さない", (t) => {
  const home = makeHome(t);
  const output = parse(run(home, "", "apply"));
  assert.equal(output.language, "japanese");
  assert.equal(output.autoMemoryEnabled, false);
  assert.equal(output.hooks.Stop[0].hooks[0].command, "~/.claude/hooks/reject-words.ts");
  assert.equal(output.hooks.PreToolUse[0].matcher, "Write|Edit");
  assert.deepEqual(backups(home), []);
});

void test("既存のキーを残し、管理対象のキーは上書きし、配列は置き換える", (t) => {
  const existing = JSON.stringify({
    model: "claude-fable-5-1",
    permissions: { defaultMode: "bypassPermissions", deny: ["stale"] },
    env: { EXTRA: "1", CLAUDE_CODE_THRIFTY_SONIC: "1" },
    language: "english",
  });
  const home = makeHome(t, existing);
  const output = parse(run(home, existing, "apply"));
  assert.equal(output.model, "claude-fable-5-1");
  assert.equal(output.permissions.defaultMode, "bypassPermissions");
  assert.deepEqual(output.permissions.deny, [
    "Bash(gh pr create:*)",
    "Bash(gh issue create:*)",
    "Bash(git push:*)",
  ]);
  assert.equal(output.env.EXTRA, "1");
  assert.equal(output.env.CLAUDE_CODE_THRIFTY_SONIC, "0");
  assert.equal(output.language, "japanese");
});

void test("出力はキーを整列した2スペースインデントのJSONで、末尾に改行を置く", (t) => {
  const existing = JSON.stringify({ zeta: 1, alpha: { b: 1, a: 2 } });
  const home = makeHome(t, existing);
  const output = run(home, existing, "apply");
  const parsed = parse(output);
  assert.deepEqual(Object.keys(parsed), Object.keys(parsed).sort());
  assert.deepEqual(Object.keys(parsed.alpha), ["a", "b"]);
  assert.equal(output, `${JSON.stringify(parsed, null, 2)}\n`);
});

for (const command of ["apply", "update", "init", "edit"]) {
  void test(`${command}で内容が変わるときは変更前の内容をsettings.json.<timestamp>.origに残す`, (t) => {
    const existing = '{"language":"english"}\n';
    const home = makeHome(t, existing);
    run(home, existing, command);
    const [backup, ...rest] = backups(home);
    assert.ok(backup);
    assert.deepEqual(rest, []);
    assert.match(backup, /^settings\.json\.\d{8}T\d{6}\.\d{3}Z\.orig$/);
    assert.equal(fs.readFileSync(path.join(home, ".claude", backup), "utf8"), existing);
  });
}

void test("内容が変わらなければorigを残さない", (t) => {
  const home = makeHome(t);
  const merged = run(home, "", "apply");
  fs.writeFileSync(path.join(home, ".claude", "settings.json"), merged);
  assert.equal(run(home, merged, "apply"), merged);
  assert.deepEqual(backups(home), []);
});

void test("書き込みを伴わないコマンドではorigを残さない", (t) => {
  const existing = '{"language":"english"}\n';
  const home = makeHome(t, existing);
  run(home, existing, "diff");
  run(home, existing, "cat");
  run(home, existing);
  assert.deepEqual(backups(home), []);
});

void test("直前のorigと同じ内容なら重ねて残さない", (t) => {
  const existing = '{"language":"english"}\n';
  const home = makeHome(t, existing);
  run(home, existing, "apply");
  run(home, existing, "apply");
  assert.equal(backups(home).length, 1);
});

void test("内容が再び変わればorigを追加で残す", (t) => {
  const first = '{"language":"english"}\n';
  const home = makeHome(t, first);
  run(home, first, "apply");
  const second = '{"language":"german"}\n';
  fs.writeFileSync(path.join(home, ".claude", "settings.json"), second);
  run(home, second, "apply");
  const contents = backups(home).map((name) =>
    fs.readFileSync(path.join(home, ".claude", name), "utf8"),
  );
  assert.deepEqual(contents.sort(), [first, second].sort());
});
