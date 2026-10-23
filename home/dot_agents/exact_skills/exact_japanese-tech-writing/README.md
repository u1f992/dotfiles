# japanese-tech-writing

A vendored copy of [k16shikano/fd287c3133457c4fd8f5601d34aa817d](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d)@[8f2d576](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d/8f2d57610a73efc97d743c9b0b0ecb1002e09fa4) ([Unlicense](https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d?permalink_comment_id=6210840#gistcomment-6210840)) with the paragraph formatting and Japanese/Latin spacing rules in [`SKILL.md.diff`](SKILL.md.diff) applied. To compare it with upstream, apply the patch to the upstream checkout first, and re-apply it after any future upstream bump:

```shellsession
$ upstream="$(mktemp -d)"
$ git clone https://gist.github.com/k16shikano/fd287c3133457c4fd8f5601d34aa817d.git "$upstream"
$ git -C "$upstream" checkout 8f2d57610a73efc97d743c9b0b0ecb1002e09fa4
$ patch -d "$upstream" -p1 < SKILL.md.diff
$ diff --recursive --exclude=.git --exclude=README.md --exclude=SKILL.md.diff --exclude=SKILL.md.orig "$upstream" .
```
