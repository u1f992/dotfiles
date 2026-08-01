import * as claude from "./claude.ts";

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");

type Route<T> = {
  validate: (x: unknown) => x is T;
  select: (x: T) => string;
  createDeny: (found: readonly string[]) => claude.DecisionFor<T>;
};

const dispatch = <Ts extends readonly Readonly<unknown>[]>(
  input: unknown,
  words: readonly string[],
  routes: { readonly [K in keyof Ts]: Readonly<Route<Ts[K]>> },
): claude.Decision | undefined => {
  const findBanned = (text: string) =>
    words.filter((word) => text.toLowerCase().includes(word.toLowerCase()));
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

const createDenyStopDecision = (
  found: readonly string[],
  styleDeny: (text: string) => string,
): claude.StopDecision => ({
  decision: "block",
  reason: styleDeny(
    `The response contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
  ),
});

const createDenyPreToolUseDecision = (
  found: readonly string[],
  styleDeny: (text: string) => string,
): claude.PreToolUseDecision => ({
  hookSpecificOutput: {
    hookEventName: "PreToolUse",
    permissionDecision: "deny",
    permissionDecisionReason: styleDeny(
      `The content to write contains banned words: ${found.join(", ")}. Rewrite it without these words.`,
    ),
  },
});

export const rejectWords = (
  input: unknown,
  banned: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
): claude.Decision =>
  !isStringArray(banned.content)
    ? {
        systemMessage: `${banned.url.pathname} must be a JSON array of strings`,
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
