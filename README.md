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

Ignore the `.tmp/` directory and the local Claude Code settings in all repositories.

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
| .claude/skills/humanizer-local | [blader/humanizer](https://github.com/blader/humanizer)@[1b48564](https://github.com/blader/humanizer/tree/1b48564898e999219882660237fde01bf4843a0f) (MIT license) |
| .claude/skills/japanese-tech-writing-local | [k16shikano/fd287c3133457c4fd8f5601d34aa817d](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d)@[5ed08e4](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d/5ed08e4475365fd233aa0d3ab71c19b87e1a5732) ([Unlicense](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d?permalink_comment_id=6210840#gistcomment-6210840)) |

To confirm that the `name` is the only change:

```shellsession
$ git clone https://github.com/blader/humanizer .tmp/humanizer
$ git -C .tmp/humanizer checkout 1b48564898e999219882660237fde01bf4843a0f
$ diff --recursive --exclude=.git .tmp/humanizer .claude/skills/humanizer-local
```

```shellsession
$ git clone https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d.git .tmp/japanese-tech-writing
$ git -C .tmp/japanese-tech-writing checkout 5ed08e4475365fd233aa0d3ab71c19b87e1a5732
$ diff --recursive --exclude=.git .tmp/japanese-tech-writing .claude/skills/japanese-tech-writing-local
```
