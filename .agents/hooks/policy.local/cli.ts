import fs from "node:fs";
import util from "node:util";

import type { HookAdapter } from "./hook-adapter.ts";

type Policy<Decision, StopDecision extends Decision> = (
  adapter: HookAdapter<Decision, StopDecision>,
  input: unknown,
  source: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
) => Decision;

type StopPolicy<Decision, StopDecision extends Decision> = (
  adapter: HookAdapter<Decision, StopDecision>,
  input: unknown,
  source: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
) => StopDecision;

const styleDeny = (text: string) =>
  util.styleText(
    "red",
    text,
    // stdoutはパイプ（非TTY）なのでvalidateStreamを切る。
    { validateStream: false },
  );

export const run = <Decision, StopDecision extends Decision>(
  adapter: HookAdapter<Decision, StopDecision>,
  policy: Policy<Decision, StopDecision>,
  configUrl: URL,
): void => {
  const input: unknown = JSON.parse(fs.readFileSync(0, "utf8"));
  const content: unknown = JSON.parse(fs.readFileSync(configUrl, "utf8"));
  const output = policy(adapter, input, { url: configUrl, content }, styleDeny);
  fs.writeFileSync(1, JSON.stringify(output));
};

export const runStop = <Decision, StopDecision extends Decision>(
  adapter: HookAdapter<Decision, StopDecision>,
  policies: readonly {
    policy: StopPolicy<Decision, StopDecision>;
    configUrl: URL;
  }[],
): void => {
  const input: unknown = JSON.parse(fs.readFileSync(0, "utf8"));
  const decisions = policies.map(({ policy, configUrl }) => {
    const content: unknown = JSON.parse(fs.readFileSync(configUrl, "utf8"));
    return policy(adapter, input, { url: configUrl, content }, styleDeny);
  });
  fs.writeFileSync(1, JSON.stringify(adapter.stop.merge(decisions)));
};
