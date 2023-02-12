#!/bin/sh
ln -sf ~/dotfiles/.vimrc ~/.vimrc
ln -sf ~/dotfiles/.gvimrc ~/.gvimrc

curl -fLo ~/.vim/colors/despacio.vim --create-dirs https://raw.githubusercontent.com/AlessandroYorba/Despacio/master/colors/despacio.vim
curl -fLo ~/.vim/autoload/plug.vim --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
