#!/usr/bin/env node
import { adapter } from "./codex.local.ts";
import { run } from "./policy.local/cli.ts";
import { rejectWords } from "./policy.local/reject-words.ts";

const url = new URL("./banned-words.local.ts", import.meta.url);
await run(adapter, rejectWords, url);
