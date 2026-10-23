#!/bin/sh
set -eu

# ln -sf ~/dotfiles/.minttyrc ~/.minttyrc
ln -sf ~/dotfiles/.vimrc ~/.vimrc
ln -sf ~/dotfiles/.gvimrc ~/.gvimrc

mkdir -p ~/.agents ~/.claude/skills ~/.codex/rules
ln -sfn ~/dotfiles/.agents/rules ~/.claude/rules
ln -sfn ~/dotfiles/.claude/hooks ~/.claude/hooks
for skill in ~/dotfiles/.agents/skills/*/; do
  ln -sfn "${skill%/}" ~/.claude/skills/
done
ln -sfn ~/dotfiles/.agents/skills ~/.agents/skills
ln -sfn ~/dotfiles/.codex/AGENTS.md ~/.codex/AGENTS.md
ln -sfn ~/dotfiles/.codex/hooks ~/.codex/hooks
ln -sfn ~/dotfiles/.codex/hooks.json ~/.codex/hooks.json
ln -sfn ~/dotfiles/.codex/rules/no-external-operations.rules ~/.codex/rules/no-external-operations.rules
node ~/dotfiles/scripts/merge-user-config.ts

curl -fLo ~/.vim/colors/despacio.vim --create-dirs https://raw.githubusercontent.com/AlessandroYorba/Despacio/master/colors/despacio.vim
curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
