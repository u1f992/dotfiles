#!/bin/sh
set -eu

ln -sf ~/dotfiles/.vimrc ~/.vimrc

git -C ~/dotfiles submodule update --init
mkdir -p ~/.agents ~/.claude/skills ~/.codex/rules
ln -sfn ~/dotfiles/.agents/rules ~/.claude/rules
ln -sfn ~/dotfiles/.claude/hooks ~/.claude/hooks
# ~/.claude/skills itself stays a regular directory because Claude Code keeps
# the skills synced from claude.ai under ~/.claude/skills/synced/.
find ~/.claude/skills -maxdepth 1 -xtype l -delete
for skill in ~/dotfiles/.agents/skills/*/; do
  ln -sfn "${skill%/}" ~/.claude/skills/
done
ln -sfn ~/dotfiles/.agents/skills ~/.agents/skills
node ~/dotfiles/scripts/generate-agent-instructions.ts
ln -sfn ~/dotfiles/.codex/AGENTS.md ~/.codex/AGENTS.md
ln -sfn ~/dotfiles/.codex/hooks ~/.codex/hooks
ln -sfn ~/dotfiles/.codex/hooks.json ~/.codex/hooks.json
ln -sfn ~/dotfiles/.codex/rules/no-external-operations.rules ~/.codex/rules/no-external-operations.rules
node ~/dotfiles/scripts/merge-user-config.ts

curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
