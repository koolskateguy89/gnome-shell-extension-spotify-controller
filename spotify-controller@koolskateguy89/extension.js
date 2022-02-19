const { GLib, GObject, St } = imports.gi;

const ByteArray = imports.byteArray;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const ExtensionUtils = imports.misc.extensionUtils;

// helper variables
let lastExtensionPlace, lastExtensionIndex;
let showInactive;
let hide = true; // synonymous to spotifyIsClosed

// signals
let onLeftPaddingChanged, onRightPaddingChanged;
let onExtensionPlaceChanged, onExtensionIndexChanged;
let onPrevIconColorChanged, onNextIconColorChanged;
let onPauseIconColorChanged, onPlayIconColorChanged;
// wow these variables have long names

const base = 'dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2';
const actionBase = base + ' org.mpris.MediaPlayer2.Player.';

// short status
//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'|egrep -A 1 \"string\"|cut -b 26-|cut -d '\"' -f 1|egrep -v ^$

//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'
const statusCmd = base + " org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'";

const toggleCmd = actionBase + 'PlayPause';
const nextCmd   = actionBase + 'Next';
const prevCmd   = actionBase + 'Previous';

const backward  = 'media-skip-backward-symbolic';
const forward   = 'media-skip-forward-symbolic';
const play      = 'media-playback-start-symbolic';
const pause     = 'media-playback-pause-symbolic';

let extension;
let settings;


function getStatus() {
    try {
        // Use GLib to send a dbus request with the expectation of receiving an MPRIS v2 response.
        let [res, out, err, exitStatus] = GLib.spawn_command_line_sync(statusCmd);

        out = ByteArray.toString(out).split("string ");

        if (!out[1]) // Spotify isn't open
            return;

        out = out[1];
        const secondSpMark = out.indexOf('"', 1);

        return out.substring(1, secondSpMark);

    } catch (err1) {
        // most likely Spotify not open i think
        global.log('spotify-controller error[getStatus]: ' + err1);
    }
}

function isPlaying() {
    const status = getStatus();
    if (status)
        return (status === "Playing");

    // if we get here, most likely Spotify isn't open
}

const run = GLib.spawn_command_line_async;
const nextSong = run.bind(null, nextCmd);
const previousSong = run.bind(null, prevCmd);
const toggle = run.bind(null, toggleCmd);

function styleStr(direction, iconType) {
    return `
        padding-${direction}: ${settings.get_int(direction + "-padding")}px;
        color: ${settings.get_string(iconType + "-icon-color")};
        `;
}

const Previous = GObject.registerClass(
class Previous extends St.Icon {
    _init(controlBar) {
        super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: backward,
            style_class: 'system-status-icon',
            style: styleStr('left', 'prev'),
        });

        // Listen for update of left padding in settings
        onLeftPaddingChanged = settings.connect(
            'changed::left-padding',
            this._styleChanged.bind(this)
        );

        onPrevIconColorChanged = settings.connect(
            'changed::prev-icon-color',
            this._styleChanged.bind(this)
        );

        this.connect('button-press-event', () => {
            if (!hide) {
                previousSong();
                controlBar.toggle._pauseIcon();
            }
        });
    }

    _styleChanged() {
        this.set_style(styleStr('left', 'prev'));
    }
});

const Next = GObject.registerClass(
class Next extends St.Icon {
    _init(controlBar) {
        super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: forward,
            style_class: 'system-status-icon',
            style: styleStr('right', 'next'),
        });

        // Listen for update of right padding in settings
        onRightPaddingChanged = settings.connect(
            'changed::right-padding',
            this._styleChanged.bind(this)
        );

        onNextIconColorChanged = settings.connect(
            'changed::next-icon-color',
            this._styleChanged.bind(this)
        );

        this.connect('button-press-event', () => {
            if (!hide) {
                nextSong();
                controlBar.toggle._pauseIcon();
            }
        });
    }

    _styleChanged() {
        this.set_style(styleStr('right', 'next'));
    }
});

const Toggle = GObject.registerClass(
class Toggle extends St.Icon {
    _init() {
        super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: play,
            style_class: 'system-status-icon',
            style: 'color: ' + settings.get_string('play-icon-color'),
        });

        onPauseIconColorChanged = settings.connect(
            'changed::pause-icon-color',
            this._styleChanged.bind(this)
        );

        onPlayIconColorChanged = settings.connect(
            'changed::play-icon-color',
            this._styleChanged.bind(this)
        );

        this.connect('button-press-event', () => {
            if (!hide) {
                toggle();
                if (this.icon_name === play) {
                    this._pauseIcon();
                } else {
                    this._playIcon();
                }
            }
        });
    }

    _styleChanged() {
        const current = this.icon_name === play ? 'play' : 'pause';
        this.set_style('color: ' + settings.get_string(`${current}-icon-color`));
    }

    _pauseIcon() {
        this.icon_name = pause;
        this._styleChanged();
    }

    _playIcon() {
        this.icon_name = play;
        this._styleChanged();
    }
});

const ControlBar = GObject.registerClass(
class ControlBar extends PanelMenu.Button {
    _init() {
        super._init();

        this.previous = new Previous(this);

        this.next = new Next(this);

        this.toggle = new Toggle();

        this.bar = new St.BoxLayout();

        this.bar.add_child(this.previous);
        this.bar.add_child(this.toggle);
        this.bar.add_child(this.next);

        if ((typeof this.add_child) === 'function')
            this.add_child(this.bar);
        else
            this.actor.add_actor(this.bar);
    }

    _insertAt(box, index) {
        box.insert_child_at_index(this.container, index);
    }

    _removeFrom(box) {
        box.remove_actor(this.container);
    }

    destroy() {
        if (this.toggle._timeout)
            this.toggle._removeTimeout();

        this.previous.destroy();
        this.next.destroy();
        this.toggle.destroy();

        this.bar.destroy();
        super.destroy();
    }
});

class Extension {
    constructor() {
    }

    enable() {
        settings = ExtensionUtils.getSettings();

        lastExtensionPlace = settings.get_string('extension-place');
        lastExtensionIndex = settings.get_int('extension-index');

        onExtensionPlaceChanged = settings.connect(
            'changed::extension-place',
            this.onExtensionLocationChanged.bind(this)
        );

        onExtensionIndexChanged = settings.connect(
            'changed::extension-index',
            this.onExtensionLocationChanged.bind(this)
        );

        this.controlBar = new ControlBar();

        this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, () => {
            this._refresh();
            return GLib.SOURCE_CONTINUE;
        });
        //this._refresh();
    }

    disable() {
        settings.disconnect(onLeftPaddingChanged);
        settings.disconnect(onRightPaddingChanged);
        settings.disconnect(onExtensionPlaceChanged);
        settings.disconnect(onExtensionIndexChanged);

        settings.disconnect(onPrevIconColorChanged);
        settings.disconnect(onNextIconColorChanged);
        settings.disconnect(onPauseIconColorChanged);
        settings.disconnect(onPlayIconColorChanged);

        settings = null;

        this.controlBar.destroy();
        hide = true;

        this._removeTimeout();
    }

    _removeTimeout() {
        if (this._timeout) {
            GLib.Source.remove(this._timeout);
            this._timeout = null;
        }
    }

    _refresh() {
        let playing = isPlaying();

        if (playing != null) {
            if (hide) {
                hide = false;
                this.onExtensionLocationChanged(settings);
            }

            this.controlBar.toggle[playing ? '_pauseIcon' : '_playIcon']();
        } else {
            // spotify isn't open

            hide = true;

            this.controlBar.toggle._playIcon();

            const newShowInactive = settings.get_boolean('show-inactive');

            if (newShowInactive !== showInactive) {
                showInactive = newShowInactive;
                if (showInactive) {
                    this.onExtensionLocationChanged(settings);
                } else {
                    let removePanel = getPanel(lastExtensionPlace);
                    this.controlBar._removeFrom(removePanel);
                }
            }
        }

        /* allows any update-time: */

        // this._removeTimeout();
        // // settings.get_double('update-time')
        // this._timeout = GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 1, this._refresh.bind(this));
        // return GLib.SOURCE_CONTINUE;
    }

    // Remove from old box & move to new box
    // USE THIS FOR ADDING TO TOP BAR
    onExtensionLocationChanged(settings, settingsKey) {
        const newExtensionPlace = settings.get_string('extension-place');
        const newExtensionIndex = settings.get_int('extension-index');

        let removeBox = getPanel(lastExtensionPlace);
        let insertBox = getPanel(newExtensionPlace);

        this.controlBar._removeFrom(removeBox);
        if (!hide || showInactive)
            this.controlBar._insertAt(insertBox, newExtensionIndex);

        lastExtensionPlace = newExtensionPlace;
        lastExtensionIndex = newExtensionIndex;
    }
}

function getPanel(place) {
    switch (place) {
        case 'left':
            return Main.panel._leftBox;
        case 'center':
            return Main.panel._centerBox;
        default:
            return Main.panel._rightBox;
    }
}

function debug(text) {
    log(`\n\n\n${text}\n\n\n`);
}

function init() {
    return new Extension();
}
