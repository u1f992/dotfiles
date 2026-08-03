import type { HookAdapter } from "./hook-adapter.ts";

type BannedWord = { word: string; reason: string };

const isBannedWord = (x: unknown): x is BannedWord =>
  typeof x === "object" &&
  x !== null &&
  "word" in x &&
  typeof x.word === "string" &&
  "reason" in x &&
  typeof x.reason === "string";

const isBannedWordArray = (x: unknown): x is BannedWord[] =>
  Array.isArray(x) && x.every(isBannedWord);

const findBanned = (text: string, words: readonly BannedWord[]) =>
  words.filter(({ word }) => text.toLowerCase().includes(word.toLowerCase()));

const formatFound = (found: readonly BannedWord[]) =>
  found.map(({ word, reason }) => `  - ${word}: ${reason}`).join("\n");

const framingNotice =
  "These words are symptoms. What is banned is the framing that produces them: " +
  "spending the turn on rapport instead of on the work. " +
  "Substituting synonyms leaves the response just as wrong. " +
  "Rebuild it from what was actually asked.";

const stopReason = (found: readonly BannedWord[]) =>
  `The response resorts to banned expressions:\n${formatFound(found)}\n${framingNotice}\n`;

const editReason = (found: readonly BannedWord[]) =>
  `The content to write resorts to banned expressions:\n${formatFound(found)}\n${framingNotice}\n`;

export const rejectWords = <Decision, StopDecision extends Decision>(
  adapter: HookAdapter<Decision, StopDecision>,
  input: unknown,
  banned: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
): Decision => {
  if (!isBannedWordArray(banned.content)) {
    return adapter.warn(
      `${banned.url.pathname} must be a JSON array of { word: string, reason: string }`,
    );
  }

  const message = adapter.stop.message(input);
  if (message !== undefined) {
    const found = findBanned(message, banned.content);
    return found.length > 0
      ? adapter.stop.block(styleDeny(stopReason(found)))
      : adapter.allow();
  }

  for (const edit of adapter.edits) {
    const content = edit.content(input);
    if (content === undefined) continue;
    const found = findBanned(content, banned.content);
    return found.length > 0
      ? edit.deny(styleDeny(editReason(found)))
      : adapter.allow();
  }

  return adapter.allow();
};

export const rejectWordsAtStop = <Decision, StopDecision extends Decision>(
  adapter: HookAdapter<Decision, StopDecision>,
  input: unknown,
  banned: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
): StopDecision => {
  if (!isBannedWordArray(banned.content)) {
    return adapter.stop.warn(
      `${banned.url.pathname} must be a JSON array of { word: string, reason: string }`,
    );
  }

  const message = adapter.stop.message(input);
  if (message === undefined) return adapter.stop.allow();

  const found = findBanned(message, banned.content);
  return found.length > 0
    ? adapter.stop.block(styleDeny(stopReason(found)))
    : adapter.stop.allow();
};
