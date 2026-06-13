# dotfiles

```
$ git clone --recursive https://github.com/u1f992/dotfiles.git ~/dotfiles
$ cd ~/dotfiles
$ ./link.sh
```

If you have already cloned without `--recursive`, fetch the submodules with:

```
$ git -C ~/dotfiles submodule update --init --recursive
```

### Windows

```
> .\link.bat
```

## .gitignore-global

Ignore the `u1f992-temp` directory in all repositories.

```
$ git config --global core.excludesfile "$(pwd)/.gitignore-global"
$ git config --global --get core.excludesfile
```

To unset:

```
$ git config --global --unset core.excludesfile
```
