set number
set cursorline

syntax on
filetype plugin indent on
set autoindent
set expandtab
set tabstop=4
set shiftwidth=4
set backspace=2
set ambiwidth=double

" Use clipboard for yank
set clipboard=unnamed,autoselect

" Automatically reload files modified in the background.
" Particularly useful when formatters or linters apply changes.
set autoread
autocmd FocusGained,BufEnter * checktime

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
Plug 'hrsh7th/vim-vsnip'
Plug 'hrsh7th/vim-vsnip-integ'

Plug 'prabirshrestha/asyncomplete.vim'
Plug 'prabirshrestha/asyncomplete-lsp.vim'

call plug#end()

" Tab completion
inoremap <expr> <Tab>   pumvisible() ? "\<C-n>" : "\<Tab>"
inoremap <expr> <S-Tab> pumvisible() ? "\<C-p>" : "\<S-Tab>"
inoremap <expr> <cr>    pumvisible() ? asyncomplete#close_popup() : "\<cr>"

" Cursor
" https://qiita.com/usamik26/items/f733add9ca910f6c5784
" https://qiita.com/Linda_pp/items/9e0c94eb82b18071db34
let &t_ti.="\e[1 q"
let &t_SI.="\e[5 q"
let &t_EI.="\e[1 q"
let &t_te.="\e[0 q"
