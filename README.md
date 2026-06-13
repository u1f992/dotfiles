# dotfiles

```shellsession
$ git clone https://github.com/u1f992/dotfiles.git ~/dotfiles
$ cd ~/dotfiles
$ ./link.sh
```

### Windows

```shellsession
> .\link.bat
```

## .gitignore-global

Ignore the `u1f992-temp` directory in all repositories.

```shellsession
$ git config --global core.excludesfile "$(pwd)/.gitignore-global"
$ git config --global --get core.excludesfile
```

To unset:

```shellsession
$ git config --global --unset core.excludesfile
```

## Claude Code

`.claude/` holds personal Claude Code configuration. Each item carries a suffix so that `core.excludesfile` (see above) ignores it in other projects. This assumes those projects do not use the suffix themselves. The suffix is `.local`, except skill directories, which use `-local` to conform to the [Agent Skills specification](https://github.com/agentskills/agentskills/blob/5d4c1fda3f786fff826c7f56b6cb3341e7f3a911/docs/specification.mdx#name-field) ([latest](https://agentskills.io/specification#name-field)).

Deploy them into a project by copying the directory in:

```shellsession
$ cp --recursive ~/dotfiles/.claude proj-dir/
```

The third-party skills below are vendored. This is because the specification also requires a skill's `name` to match the parent directory name, so an unmodified submodule and the `-local` suffix cannot coexist.

| Directory | Upstream |
| --- | --- |
| .claude/skills/humanizer-local | [blader/humanizer](https://github.com/blader/humanizer)@[9600f2b](https://github.com/blader/humanizer/tree/9600f2b7241cb4eed6ad803abee5ea01d67fe8e4) (MIT license) |

To confirm that the `name` is the only change:

```shellsession
$ git clone https://github.com/blader/humanizer .tmp/humanizer
$ git -C .tmp/humanizer checkout 9600f2b7241cb4eed6ad803abee5ea01d67fe8e4
$ diff --recursive --exclude=.git .tmp/humanizer .claude/skills/humanizer-local
```
