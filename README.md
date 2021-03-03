# Gnome SHELL Spotify Controller

[![License: GPL v3](https://img.shields.io/badge/License-GPL%20v3-blue.svg)](https://www.gnu.org/licenses/gpl-3.0)

**This extension started as a clone of the [Spotify Label Extension](https://github.com/mheine/gnome-shell-spotify-label) that I adapted quite a bit. Credit to [Marcus Heine (@mheine)](https://github.com/mheine) for the majority of the code here.**

**Table of Contents** _generated with [DocToc](https://github.com/thlorenz/doctoc)_
<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [Prerequisites](#prerequisites)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

Use this GNOME Shell extension to skip, toggle playback and restart/backtrack the current song. This works well with the [Spotify Label Extension](https://github.com/mheine/gnome-shell-spotify-label), as seen on the left of the example below*

![Error mi amigo!](res/example.png "Extension on far right!")

\* I have customised my installation of the Spotify Label extension, see issue [#1](https://github.com/koolskateguy89/gnome-shell-extension-spotify-controller/issues/1) for more info

## Installation

The easiest way to install this is through the [GNOME Extension website](https://extensions.gnome.org/extension/4013/spotify-controller/), but here's how to manually install this extension:

- **Clone the repo (for GNOME 3.28.x only)**

  `git clone -b 3.28 --single-branch https://github.com/koolskateguy89/gnome-shell-extension-spotify-controller.git`

- **cd into the repo directory**

  `cd gnome-shell-extension-spotify-controller`

- **Copy the extension into your extensions folder (or make a symbolic link if you want)**

  `cp -R spotify-controller@koolskateguy89 ~/.local/share/gnome-shell/extensions/`

  OR

  `ln -s "$(pwd)/spotify-controller@koolskateguy89" ~/.local/share/gnome-shell/extensions/`

- **Restart GNOME Shell or logout then log back in**

  To restart GNOME Shell: Press Alt+F2 then type 'r' (no quotes) and press enter

- **Enable the extension**

  `gnome-shell-extension-prefs` (deprecated but works for now) then enable 'Spotify Controller'

If you copied the extension, you can delete the repo folder (`cd .. && rm -r gnome-shell-extension-spotify-controller`)

## Prerequisites

The only thing you 'need' is `dbus-send` but I think it comes with GNOME Shell/Linux. To check you have it, simply run the command
```
command -v dbus-send
```
You should see a path pointing to the executable file for `dbus-send` (for me it's `/usr/bin/dbus-send`).

If there was no output, yeah... well... good luck with that.

## License

This project is licensed under the GNU General Public License - see the [LICENSE](LICENSE) file for details
