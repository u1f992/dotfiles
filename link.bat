mklink %USERPROFILE%"\_vimrc" %USERPROFILE%"\dotfiles\.vimrc"
mklink %USERPROFILE%"\_gvimrc" %USERPROFILE%"\dotfiles\.gvimrc"

curl -fLo %USERPROFILE%"\vimfiles\colors\despacio.vim" --create-dirs https://raw.githubusercontent.com/AlessandroYorba/Despacio/master/colors/despacio.vim
curl -fLo %USERPROFILE%"\vimfiles\autoload\plug.vim" --create-dirs https://raw.githubusercontent.com/junegunn/vim-plug/master/plug.vim
