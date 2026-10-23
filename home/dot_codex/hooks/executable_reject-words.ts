#!/usr/bin/env node
import { adapter } from "./codex.ts";
import { run } from "./policy/cli.ts";
import { rejectWords } from "./policy/reject-words.ts";

const url = new URL("./banned-words.ts", import.meta.url);
await run(adapter, rejectWords, url);
