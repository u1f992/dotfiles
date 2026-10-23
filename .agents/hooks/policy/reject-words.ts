import type { HookAdapter } from "./hook-adapter.ts";

export type Ban = { patterns: [RegExp, ...RegExp[]]; reason: string };

type Violation = { matched: readonly RegExp[]; reason: string };

const isPatterns = (x: unknown): x is Ban["patterns"] =>
  Array.isArray(x) && x.length > 0 && x.every((p) => p instanceof RegExp);

const isBan = (x: unknown): x is Ban =>
  typeof x === "object" &&
  x !== null &&
  "patterns" in x &&
  isPatterns(x.patterns) &&
  "reason" in x &&
  typeof x.reason === "string";

const isBanArray = (x: unknown): x is Ban[] =>
  Array.isArray(x) && x.every(isBan);

const findViolations = (text: string, bans: readonly Ban[]): Violation[] =>
  bans.flatMap(({ patterns, reason }) => {
    const matched = patterns.filter((pattern) => text.search(pattern) !== -1);
    return matched.length > 0 ? [{ matched, reason }] : [];
  });

const formatViolations = (violations: readonly Violation[]) =>
  violations
    .map(({ matched, reason }) => `  - ${matched.join(", ")}: ${reason}`)
    .join("\n");

const framingNotice =
  "These words are symptoms. What is banned is the framing that produces them: " +
  "spending the turn on rapport instead of on the work. " +
  "Substituting synonyms leaves the response just as wrong. " +
  "Rebuild it from what was actually asked.";

const stopReason = (violations: readonly Violation[]) =>
  `The response resorts to banned expressions:\n${formatViolations(violations)}\n${framingNotice}\n`;

const editReason = (violations: readonly Violation[]) =>
  `The content to write resorts to banned expressions:\n${formatViolations(violations)}\n${framingNotice}\n`;

export const rejectWords = <Decision>(
  adapter: HookAdapter<Decision>,
  input: unknown,
  source: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
): Decision => {
  if (!isBanArray(source.content)) {
    return adapter.warn(
      `${source.url.pathname} must export default an array of { patterns: [RegExp, ...RegExp[]], reason: string }`,
    );
  }

  const message = adapter.stop.message(input);
  if (message !== undefined) {
    const violations = findViolations(message, source.content);
    return violations.length > 0
      ? adapter.stop.block(styleDeny(stopReason(violations)))
      : adapter.allow();
  }

  for (const edit of adapter.edits) {
    const content = edit.content(input);
    if (content === undefined) continue;
    const violations = findViolations(content, source.content);
    return violations.length > 0
      ? edit.deny(styleDeny(editReason(violations)))
      : adapter.allow();
  }

  return adapter.allow();
};
