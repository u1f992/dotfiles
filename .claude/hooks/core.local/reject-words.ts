import * as claude from "./claude.ts";

const isStringArray = (x: unknown): x is string[] =>
  Array.isArray(x) && x.every((v) => typeof v === "string");

type FindBanned = (text: string) => string[];

type Decide = () => claude.Decision;
const noDecision: Decide = () => ({});

type Route = (x: unknown, findBanned: FindBanned) => Decide | undefined;
const route =
  <T>(
    validate: (x: unknown) => x is T,
    select: (x: T) => string,
    createDeny: (found: readonly string[]) => claude.DecisionFor<T>,
  ): Route =>
  (x, findBanned) => {
    if (!validate(x)) return undefined;
    const found = findBanned(select(x));
    return found.length > 0 ? () => createDeny(found) : noDecision;
  };

const dispatch = (
  x: unknown,
  findBanned: FindBanned,
  routes: readonly Route[],
): claude.Decision => {
  const decide = routes.reduce<Decide | undefined>(
    (decide, r) => decide ?? r(x, findBanned),
    undefined,
  );
  return (decide ?? noDecision)();
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
): claude.Decision => {
  if (!isStringArray(banned.content)) {
    return {
      systemMessage: `${banned.url.pathname} must be a JSON array of strings`,
    };
  }
  const words = banned.content;

  return dispatch(
    input,
    (text) =>
      words.filter((word) => text.toLowerCase().includes(word.toLowerCase())),
    [
      route(
        claude.isStopHookInput,
        (x) => x.last_assistant_message,
        (found) => createDenyStopDecision(found, styleDeny),
      ),
      route(
        claude.isWriteToolUseInput,
        (x) => x.tool_input.content,
        (found) => createDenyPreToolUseDecision(found, styleDeny),
      ),
      route(
        claude.isEditToolUseInput,
        (x) => x.tool_input.new_string,
        (found) => createDenyPreToolUseDecision(found, styleDeny),
      ),
    ],
  );
};
