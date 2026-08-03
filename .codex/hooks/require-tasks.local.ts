#!/usr/bin/env node
import { adapter } from "./codex.local.ts";
import { run } from "./policy.local/cli.ts";
import { requireTasks } from "./policy.local/require-tasks.ts";

const url = new URL("./require-tasks.local.json", import.meta.url);
run(adapter, requireTasks, url);
