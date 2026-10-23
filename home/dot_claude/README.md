# Claude Code

Claude Code loads `~/.claude/rules/*.md` in every project.

`modify_settings.json` sets `CLAUDE_CODE_THRIFTY_SONIC` to `"0"`. The variable is undocumented as of v2.1.274 and overrides the `tengu_thrifty_sonic` feature flag, which in auto and `bypassPermissions` modes injects an instruction to read, search, and edit files through Bash in place of the Read, Edit, and Write tools. Path-scoped rules and nested `CLAUDE.md` files load through the Read tool, and hooks matched on `Read`, `Edit`, or `Write` run for those tools, so file access through Bash triggers none of them.

Public mentions: [kawasin73's post](https://kawasin73.hatenablog.com/entry/2026/09/05/092056) (2026-09-05), [anthropics/claude-code#92271](https://github.com/anthropics/claude-code/issues/92271), and the comments on #90450 that [introduce the variable](https://github.com/anthropics/claude-code/issues/90450#issuecomment-5551944607) and [verify it through the `auto_mode` transcript attachment](https://github.com/anthropics/claude-code/issues/90450#issuecomment-5552521491).
