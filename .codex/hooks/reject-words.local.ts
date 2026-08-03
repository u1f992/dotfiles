#!/usr/bin/env node
import { adapter } from "./codex.local.ts";
import { run } from "./policy.local/cli.ts";
import { rejectWords } from "./policy.local/reject-words.ts";

const url = new URL("./reject-words.local.json", import.meta.url);
run(adapter, rejectWords, url);
