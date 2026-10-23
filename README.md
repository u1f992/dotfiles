# dotfiles

```shellsession
$ chezmoi init --apply u1f992
```

```shellsession
$ chezmoi cd
$ npm install
$ npm test
```

## Coding agents

`home/dot_agents/`, `home/dot_claude/`, and `home/dot_codex/` hold the personal configuration for Claude Code and Codex.

```text
home/
├── .chezmoi.toml.tmpl     rendered into ~/.config/chezmoi/chezmoi.toml by chezmoi init
├── dot_agents/
│   ├── hooks/             shared hook policy and the banned word list
│   ├── exact_rules/       shared rules, one topic per file
│   └── exact_skills/      shared skills; .chezmoiexternal.toml pins the third-party ones by URL
├── dot_claude/
│   ├── hooks/             Claude Code hook entry point and adapter
│   ├── skills/            one symlink per shared skill
│   ├── modify_settings.json.ts
│   └── symlink_rules
└── dot_codex/
    ├── AGENTS.md.tmpl     concatenates dot_agents/exact_rules/*.md
    ├── hooks/
    ├── hooks.json
    └── rules/
```

`chezmoi apply` writes this into the home directory:

| Target | Source |
| --- | --- |
| `~/.agents/` | `dot_agents/`; `skills/humanizer` and `skills/cognitive-rhythm-writing` are extracted from the archives in `exact_skills/.chezmoiexternal.toml` |
| `~/.claude/rules` | symlink to `~/.agents/rules` |
| `~/.claude/hooks/` | `dot_claude/hooks/` |
| `~/.claude/skills/<skill>` | symlink to `~/.agents/skills/<skill>`, one per skill |
| `~/.codex/AGENTS.md` | rendered from `AGENTS.md.tmpl` |
| `~/.codex/hooks/` | `dot_codex/hooks/` |
| `~/.codex/hooks.json` | `dot_codex/hooks.json` |
| `~/.codex/rules/no-external-operations.rules` | `dot_codex/rules/no-external-operations.rules` |

To remove a rule, delete its file from `exact_rules/`. To remove a skill, delete it from `exact_skills/` and its `symlink_` entry from `dot_claude/skills/`, then remove the link under `~/.claude/skills` by hand.

Under each agent's `hooks/`, `banned-words.ts` and the files in `policy/` are symlinks into `dot_agents/hooks/`. Edit the shared policy there, and the next `chezmoi apply` updates both `~/.claude/hooks/` and `~/.codex/hooks/`.

`modify_settings.json.ts` merges its settings into `~/.claude/settings.json`; `.chezmoi.toml.tmpl` registers node as the interpreter that runs it. Keys that exist only in the home file are kept, and `chezmoi diff` shows the result before `chezmoi apply` writes it. An apply that changes the file first saves the previous content next to it as `settings.json.<timestamp>.orig`.
