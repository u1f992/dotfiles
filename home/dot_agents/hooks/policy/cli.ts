import fs from "node:fs";

import type { HookAdapter } from "./hook-adapter.ts";

type Policy<Decision> = (
  adapter: HookAdapter<Decision>,
  input: unknown,
  source: { url: URL; content: unknown },
) => Decision;

export const run = async <Decision>(
  adapter: HookAdapter<Decision>,
  policy: Policy<Decision>,
  configUrl: URL,
): Promise<void> => {
  const input: unknown = JSON.parse(fs.readFileSync(0, "utf8"));
  const { default: content }: { default: unknown } = await import(configUrl.href);
  const output = policy(adapter, input, { url: configUrl, content });
  fs.writeFileSync(1, JSON.stringify(output));
};
