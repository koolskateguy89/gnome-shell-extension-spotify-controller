# Commands

## extension.js log

```sh
clear && journalctl -o cat -f /usr/bin/gnome-shell
```

## prefs.js log

```sh
clear && journalctl -o cat -f /usr/bin/gjs
```

# Me TODO

## Dbus session

```js
log(`${Gio.DBus.session.constructor.name}`);
```
