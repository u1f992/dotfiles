import * as claude from "./claude.ts";

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

type Route<T> = {
  validate: (x: unknown) => x is T;
  select: (x: T) => string;
  createDeny: (found: readonly BannedWord[]) => claude.DecisionFor<T>;
};

const dispatch = <Ts extends readonly Readonly<unknown>[]>(
  input: unknown,
  words: readonly BannedWord[],
  routes: { readonly [K in keyof Ts]: Readonly<Route<Ts[K]>> },
): claude.Decision | undefined => {
  const findBanned = (text: string) =>
    words.filter(({ word }) => text.toLowerCase().includes(word.toLowerCase()));
  return routes.reduce<(() => claude.Decision) | undefined>(
    (decide, { validate, select, createDeny }) => {
      if (decide !== undefined) return decide;
      if (!validate(input)) return undefined;
      const found = findBanned(select(input));
      return found.length > 0 ? () => createDeny(found) : () => ({});
    },
    undefined,
  )?.();
};

const formatFound = (found: readonly BannedWord[]) =>
  found.map(({ word, reason }) => `  - ${word}: ${reason}`).join("\n");

const framingNotice =
  "These words are symptoms. What is banned is the framing that produces them: " +
  "spending the turn on rapport instead of on the work. " +
  "Substituting synonyms leaves the response just as wrong. " +
  "Rebuild it from what was actually asked.";

const createDenyStopDecision = (
  found: readonly BannedWord[],
  styleDeny: (text: string) => string,
): claude.StopDecision => ({
  decision: "block",
  reason: styleDeny(
    `The response resorts to banned expressions:\n${formatFound(found)}\n${framingNotice}\n`,
  ),
});

const createDenyPreToolUseDecision = (
  found: readonly BannedWord[],
  styleDeny: (text: string) => string,
): claude.PreToolUseDecision => ({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: styleDeny(
      `The content to write resorts to banned expressions:\n${formatFound(found)}\n${framingNotice}\n`,
    ),
  },
});

export const rejectWords = (
  input: unknown,
  banned: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
): claude.Decision =>
  !isBannedWordArray(banned.content)
    ? {
        systemMessage: `${banned.url.pathname} must be a JSON array of { word: string, reason: string }`,
      }
    : (dispatch(input, banned.content, [
        {
          validate: claude.isStopHookInput,
          select: (x) => x.last_assistant_message,
          createDeny: (found) => createDenyStopDecision(found, styleDeny),
        },
        {
          validate: claude.isWriteToolUseInput,
          select: (x) => x.tool_input.content,
          createDeny: (found) => createDenyPreToolUseDecision(found, styleDeny),
        },
        {
          validate: claude.isEditToolUseInput,
          select: (x) => x.tool_input.new_string,
          createDeny: (found) => createDenyPreToolUseDecision(found, styleDeny),
        },
      ]) ?? {});
