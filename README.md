# dotfiles

```shellsession
$ git clone https://github.com/u1f992/dotfiles.git ~/dotfiles
$ cd ~/dotfiles
$ npm install
$ ./link.sh
```

### Windows

```shellsession
> .\link.bat
```

## .gitignore-global

Ignore the `.tmp/` directory in all repositories.

```shellsession
$ git config --global core.excludesfile "$(pwd)/.gitignore-global"
$ git config --global --get core.excludesfile
```

To unset:

```shellsession
$ git config --global --unset core.excludesfile
```

OXC reads exclusions from `.gitignore` and `.git/info/exclude`, but [deliberately ignores the user's global Git ignore file](https://github.com/oxc-project/oxc/blob/033ddf6d384ea054e106b9706dbffaed57887947/crates/oxc_config/src/walk.rs#L20-L34). In projects that use OXC, append the global exclusions to `.git/info/exclude`:

```shellsession
$ git_global_ignore="$(git config --path --get core.excludesFile)" && git_info_exclude="$(git rev-parse --path-format=absolute --git-path info/exclude)" && test -f "$git_global_ignore" && test -f "$git_info_exclude" && { printf '\n'; cat "$git_global_ignore"; } >> "$git_info_exclude"
```

## Coding agents

`.agents/`, `.claude/`, and `.codex/` hold the personal configuration for Claude Code and Codex, and `link.sh` deploys them into the home directory so that every project on the machine picks them up.

```text
.agents/
├── hooks/     shared hook policy and the banned word list
├── rules/     shared rules, one topic per file
└── skills/    shared skills
.claude/
├── hooks/     Claude Code hook entry point and adapter
└── settings.json
.codex/
├── AGENTS.md  generated from .agents/rules/
├── config.toml
├── hooks/     Codex hook entry point and adapter
├── hooks.json
└── rules/
```

`link.sh` creates these symlinks:

| Link | Target |
| --- | --- |
| `~/.claude/rules` | `.agents/rules` |
| `~/.claude/hooks` | `.claude/hooks` |
| `~/.claude/skills/<skill>` | `.agents/skills/<skill>`, one link per skill |
| `~/.agents/skills` | `.agents/skills` |
| `~/.codex/AGENTS.md` | `.codex/AGENTS.md` |
| `~/.codex/hooks` | `.codex/hooks` |
| `~/.codex/hooks.json` | `.codex/hooks.json` |
| `~/.codex/rules/no-external-operations.rules` | `.codex/rules/no-external-operations.rules` |

`~/.claude/skills` itself stays a regular directory because Claude Code keeps the skills synced from claude.ai under `~/.claude/skills/synced/`.

Claude Code and Codex write to `~/.claude/settings.json` and `~/.codex/config.toml` themselves, so `link.sh` merges `.claude/settings.json` and `.codex/config.toml` into them with `scripts/merge-user-config.ts` instead of linking. Tables are merged key by key, and a key present in the template takes the template's value. When the merge changes an existing file, the previous content is kept next to it as `<file>.<timestamp>.bak`. Running `link.sh` again after editing a template or a rule reapplies the merge.

### Claude Code

`~/.claude/rules/*.md` loads in every project, so the shared rules need no `CLAUDE.md`.

`.claude/settings.json` sets `CLAUDE_CODE_THRIFTY_SONIC` to `"0"`. The variable is undocumented as of v2.1.274 and overrides the `tengu_thrifty_sonic` feature flag, which in auto and `bypassPermissions` modes injects an instruction to read, search, and edit files through Bash in place of the Read, Edit, and Write tools. Path-scoped rules and nested `CLAUDE.md` files load through the Read tool, and hooks matched on `Read`, `Edit`, or `Write` run for those tools, so file access through Bash triggers none of them.

Public mentions: [kawasin73's post](https://kawasin73.hatenablog.com/entry/2026/09/05/092056) (2026-09-05), [anthropics/claude-code#92271](https://github.com/anthropics/claude-code/issues/92271), and the comments on #90450 that [introduce the variable](https://github.com/anthropics/claude-code/issues/90450#issuecomment-5551944607) and [verify it through the `auto_mode` transcript attachment](https://github.com/anthropics/claude-code/issues/90450#issuecomment-5552521491).

> To share project instructions between coding agents, a relative symlink from `CLAUDE.md` to `AGENTS.md` is recommended:
>
> ```shellsession
> $ ln -s AGENTS.md CLAUDE.md
> ```

### Codex

Codex reads `~/.codex/AGENTS.md` before the project's `AGENTS.md` files. `npm run generate:instructions` regenerates `.codex/AGENTS.md` by joining the files under `.agents/rules/` in name order. Run it after changing a rule, then run `link.sh` again if `~/.codex/config.toml` also needs the merge.

`.codex/config.toml` enables hooks. `.codex/rules/no-external-operations.rules` blocks `gh pr create`, `gh issue create`, and `git push`. Codex requires each non-managed hook to be reviewed and trusted once; open `/hooks` on first use.

### Skills

The third-party skills under `.agents/skills/` are git submodules pinned to the revision recorded in this repository. `link.sh` initializes them. `git submodule status` shows the pinned revisions.

| Directory | Upstream |
| --- | --- |
| .agents/skills/humanizer | [blader/humanizer](https://github.com/blader/humanizer) (MIT license) |
| .agents/skills/cognitive-rhythm-writing | [k16shikano/eb2929f13ed19c97188393d297be8432](https://gist.github.com/k16shikano/eb2929f13ed19c97188393d297be8432) ([Unlicense](https://gist.github.com/k16shikano/67625f2a7d96e3bbdfae8d571a936063)) |

`.agents/skills/japanese-tech-writing` is a vendored copy of [k16shikano/fd287c3133457c4fd8f5601d34aa817d](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d)@[8f2d576](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d/8f2d57610a73efc97d743c9b0b0ecb1002e09fa4) ([Unlicense](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d?permalink_comment_id=6210840#gistcomment-6210840)) with the paragraph formatting and Japanese/Latin spacing rules in [`SKILL.md.diff`](.agents/skills/japanese-tech-writing/SKILL.md.diff) applied. To compare it with upstream, apply the patch to the upstream checkout first, and re-apply it after any future upstream bump:

```shellsession
$ git clone https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d.git .tmp/japanese-tech-writing
$ git -C .tmp/japanese-tech-writing checkout 8f2d57610a73efc97d743c9b0b0ecb1002e09fa4
$ patch -d .tmp/japanese-tech-writing -p1 < .agents/skills/japanese-tech-writing/SKILL.md.diff
$ diff --recursive --exclude=.git --exclude=SKILL.md.diff --exclude=SKILL.md.orig .tmp/japanese-tech-writing .agents/skills/japanese-tech-writing
```

### Hooks

Shared hook data and host-independent policy code have one canonical copy under `.agents/hooks/`:

```text
.agents/hooks/
├── policy.local/
│   ├── cli.ts
│   ├── hook-adapter.ts
│   └── reject-words.ts
└── banned-words.local.ts
```

`banned-words.local.ts` exports the banned word list as its default export, typed as `Ban[]` from `policy.local/reject-words.ts`. Each entry pairs one or more `RegExp` patterns with the reason shown on rejection; the policy searches the checked text with each pattern as written, so case sensitivity is decided per pattern by its flags, and a rejection lists the patterns that matched next to their shared reason. Claude and Codex keep only their host-specific hook schema and `HookAdapter` in `.claude/hooks/claude.local.ts` and `.codex/hooks/codex.local.ts`. Their `policy.local/` directories and `banned-words.local.ts` are relative symlinks to `.agents/hooks/`. The executable entry points only connect an adapter, a policy, and the word list module; stdin/stdout handling and the dynamic import of that module live in the shared `cli.ts`.

Each host registers `reject-words.local.ts` for both the Stop and PreToolUse events; the policy checks the final assistant message on Stop and the content to be written on PreToolUse. Codex's edit adapter extracts only added lines from an `apply_patch` command, so deleted and unchanged context do not trigger the banned-word policy.
