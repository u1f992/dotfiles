#!/usr/bin/env node
import { adapter } from "./codex.local.ts";
import { runStop } from "./policy.local/cli.ts";
import { rejectWordsAtStop } from "./policy.local/reject-words.ts";
import { requireTasks } from "./policy.local/require-tasks.ts";

runStop(adapter, [
  {
    policy: rejectWordsAtStop,
    configUrl: new URL("./reject-words.local.json", import.meta.url),
  },
  {
    policy: requireTasks,
    configUrl: new URL("./require-tasks.local.json", import.meta.url),
  },
]);
