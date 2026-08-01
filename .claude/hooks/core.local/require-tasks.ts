import * as claude from "./claude.ts";

type Task = { done: boolean; task: string };
const isTask = (x: unknown): x is Task =>
  typeof x === "object" &&
  x !== null &&
  "done" in x &&
  typeof x.done === "boolean" &&
  "task" in x &&
  typeof x.task === "string";
const isTaskArray = (x: unknown): x is Task[] =>
  Array.isArray(x) && x.every(isTask);

export const requireTasks = (
  input: unknown,
  tasks: { url: URL; content: unknown },
  styleDeny: (text: string) => string,
): claude.StopDecision => {
  if (!claude.isStopHookInput(input)) {
    return {};
  }

  if (!isTaskArray(tasks.content)) {
    return {
      systemMessage: `${tasks.url.pathname} must be a JSON array of { done: boolean, task: string }`,
    };
  }

  const pendingTasks = tasks.content.filter(({ done }) => !done);
  if (pendingTasks.length === 0) {
    return {};
  }

  const list = pendingTasks.map(({ task }) => `  - ${task}`).join("\n");
  return {
    decision: "block",
    reason: styleDeny(
      `Work is not finished. ${pendingTasks.length} open task(s) in ${tasks.url.pathname}:\n${list}\n` +
        `Continue working. Set "done" to true on a task once it is done and verified.\n`,
    ),
  };
};
