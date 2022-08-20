# Commands

## extension.js log

```sh
clear && journalctl -o cat -f /usr/bin/gnome-shell
```

```sh
journalctl /usr/bin/gnome-shell | grep 'spotify-controller@koolskateguy89'
```

## prefs.js log

```sh
clear && journalctl -o cat -f /usr/bin/gjs
```

```sh
journalctl /usr/bin/gjs | grep 'spotify-controller@koolskateguy89'
```

## schemas

```sh
glib-compile-schemas schemas/
```
