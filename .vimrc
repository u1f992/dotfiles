set number
set cursorline

syntax on
filetype plugin indent on
set autoindent
set expandtab
set tabstop=4
set shiftwidth=4
set backspace=2

" Use clipboard for yank
set clipboard=unnamed,autoselect

" Despacio
" https://github.com/AlessandroYorba/Despacio
colorscheme despacio

" For Windows Terminal
" https://github.com/microsoft/terminal/issues/832
set termguicolors

if has("win32") || has("win64")
    " Use PowerShell for :term
    " set shell=pwsh
endif

" vim-plug
" https://github.com/junegunn/vim-plug
call plug#begin()

" vim-lsp
" https://github.com/mattn/vim-lsp-settings
Plug 'prabirshrestha/vim-lsp'
Plug 'mattn/vim-lsp-settings'

Plug 'prabirshrestha/asyncomplete.vim'
Plug 'prabirshrestha/asyncomplete-lsp.vim'

Plug 'prettier/vim-prettier', { 'do': 'npm install --frozen-lockfile --production' }

call plug#end()
