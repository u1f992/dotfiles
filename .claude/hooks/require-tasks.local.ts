#!/usr/bin/env node
import fs from "node:fs";
import util from "node:util";

import { requireTasks } from "./core.local/require-tasks.ts";

const input = JSON.parse(fs.readFileSync(0, "utf8"));
const url = new URL("./require-tasks.local.json", import.meta.url);
const content = JSON.parse(fs.readFileSync(url, "utf8"));
const output = JSON.stringify(
  requireTasks(input, { url, content }, (text) =>
    util.styleText(
      "red",
      text,
      // stdoutはパイプ（非TTY）なのでvalidateStreamを切る。
      { validateStream: false },
    ),
  ),
);
fs.writeFileSync(1, output);
