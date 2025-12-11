# dotfiles

```
$ git clone https://github.com/u1f992/dotfiles.git ~/dotfiles
$ cd ~/dotfiles
$ ./link.sh
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
