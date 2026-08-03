# Repository instructions

- Respond in Japanese unless the user requests another language.
- When creating temporary files, downloads, or clones, prefer the repository-local `.tmp/` directory over `/tmp/`.
- Use `rg` or `rg --files` for repository searches. Do not pipe stdout or stderr directly through `head`, `tail`, or `grep`; if filtering a command's logs is necessary, preserve the complete output with `tee` at the same time.
- For primary source code and documentation, obtain the canonical original with `gh`, `git clone`, an official API, `curl`, or `wget`. Do not rely on hosted summary-fetch tools, mirrors of uncertain maintenance status, third-party redistributions, or summary articles as substitutes for the primary source.
- Avoid unnatural, empty expressions and the conversational framing that produces them. The mechanically checked list lives at `.codex/hooks/reject-words.local.json`. Complete the requested work instead of spending a turn praising the request, advertising the answer's candor, or making empty offers. Substituting synonyms does not fix that framing.
- Before ending a task, ensure every entry in `.codex/hooks/require-tasks.local.json` is marked `done: true` and verified.
