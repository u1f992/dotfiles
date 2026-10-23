import fs from "node:fs";
import util from "node:util";

import type { HookAdapter } from "./hook-adapter.ts";

type Policy<Decision> = (
  adapter: HookAdapter<Decision>,
  input: unknown,
  source: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
) => Decision;

const styleDeny = (text: string) =>
  util.styleText(
    "red",
    text,
    // stdoutはパイプ（非TTY）なのでvalidateStreamを切る。
    { validateStream: false },
  );

export const run = <Decision>(
  adapter: HookAdapter<Decision>,
  policy: Policy<Decision>,
  configUrl: URL,
): void => {
  const input: unknown = JSON.parse(fs.readFileSync(0, "utf8"));
  const content: unknown = JSON.parse(fs.readFileSync(configUrl, "utf8"));
  const output = policy(adapter, input, { url: configUrl, content }, styleDeny);
  fs.writeFileSync(1, JSON.stringify(output));
};
