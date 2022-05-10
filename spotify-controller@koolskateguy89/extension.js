const { Gio, GObject, St } = imports.gi;

const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;

const ExtensionUtils = imports.misc.extensionUtils;

// helper variables
let lastExtensionPlace, lastExtensionIndex;
let showInactive;
let hide = true; // synonymous to spotifyIsClosed

// signals
let settingsSignals;

const backward  = 'media-skip-backward-symbolic';
const forward   = 'media-skip-forward-symbolic';
const play      = 'media-playback-start-symbolic';
const pause     = 'media-playback-pause-symbolic';

let settings;


// thanks esenliyim - https://github.com/esenliyim/sp-tray/blob/master/panelButton.js
// https://wiki.gnome.org/Gjs/Examples/DBusClient
// https://www.andyholmes.ca/articles/dbus-in-gjs.html#high-level-interfaces
// dbus constants
const dest = 'org.mpris.MediaPlayer2.spotify';
const path = '/org/mpris/MediaPlayer2';
const playerInterface = `
<node>
<interface name="org.mpris.MediaPlayer2.Player">
    <property name="PlaybackStatus" type="s" access="read" />
    <method name="Next" />
    <method name="Previous" />
    <method name="PlayPause" />
</interface>
</node>
`;

// Declare the proxy class based on the interface
const SpotifyProxy = Gio.DBusProxy.makeProxyWrapper(playerInterface);

let spotifyProxy;
let spotifyProxySignals;

function setupSpotifyProxy() {
    if (spotifyProxy)
        return;

    // Get the MediaPlayer instance from the bus
    spotifyProxy = SpotifyProxy(Gio.DBus.session, dest, path);
    spotifyProxySignals = [];

    spotifyProxy.isSpotifyOpen = function() {
        return this.PlaybackStatus != null;
    };

    spotifyProxy.isPlaying = function() {
        return this.isSpotifyOpen() && this.PlaybackStatus === 'Playing';
    };

    // hide impl
    spotifyProxy.next = spotifyProxy.NextSync;

    spotifyProxy.previous = spotifyProxy.PreviousSync;

    spotifyProxy.playPause = spotifyProxy.PlayPauseSync;
}


function styleStr(direction, iconType) {
    let style;
    if (iconType) {
        style = `padding-${direction}: ${settings.get_int(direction + "-padding")}px;`
    } else {
        // called by toggle
        style = '';
        iconType = direction;
    }

    const useSameColors = settings.get_boolean('same-color-buttons');
    iconType = useSameColors ? 'prev' : iconType;
    style += `color: ${settings.get_string(iconType + "-icon-color")};`

    return style;
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
        settingsSignals.push(settings.connect(
            'changed::left-padding',
            this._styleChanged.bind(this)
        ));

        settingsSignals.push(settings.connect(
            'changed::prev-icon-color',
            controlBar._sameColorButtonsChanged.bind(controlBar)
        ));

        this.connect('button-press-event', () => {
            if (!hide) {
                spotifyProxy.previous();
            }
        });
    }

    _styleChanged() {
        this.set_style(styleStr('left', 'prev'));
    }
});

const Next = GObject.registerClass(
class Next extends St.Icon {
    _init() {
        super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: forward,
            style_class: 'system-status-icon',
            style: styleStr('right', 'next'),
        });

        // Listen for update of right padding in settings
        settingsSignals.push(settings.connect(
            'changed::right-padding',
            this._styleChanged.bind(this)
        ));

        settingsSignals.push(settings.connect(
            'changed::next-icon-color',
            this._styleChanged.bind(this)
        ));

        this.connect('button-press-event', () => {
            if (!hide) {
                spotifyProxy.next();
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
            style: styleStr('play'),
        });

        settingsSignals.push(settings.connect(
            'changed::pause-icon-color',
            this._styleChanged.bind(this)
        ));

        settingsSignals.push(settings.connect(
            'changed::play-icon-color',
            this._styleChanged.bind(this)
        ));

        this.connect('button-press-event', () => {
            if (!hide) {
                spotifyProxy.playPause();
            }
        });
    }

    _styleChanged() {
        const current = this.icon_name === play ? 'play' : 'pause';
        this.set_style(styleStr(current));
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

        this.next = new Next();

        this.toggle = new Toggle();

        this.buttons = [
            this.previous,
            this.toggle,
            this.next,
        ];

        settingsSignals.push(settings.connect(
            'changed::same-color-buttons',
            this._sameColorButtonsChanged.bind(this)
        ));

        this.bar = new St.BoxLayout();

        this.buttons.forEach(btn => this.bar.add_child(btn));

        if ((typeof this.add_child) === 'function')
            this.add_child(this.bar);
        else
            this.actor.add_actor(this.bar);
    }

    _sameColorButtonsChanged() {
        this.buttons.forEach(btn => btn._styleChanged());
    }

    _insertAt(box, index) {
        box.insert_child_at_index(this.container, index);
    }

    _removeFrom(box) {
        box.remove_actor(this.container);
    }

    destroy() {
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
        this._initSettings();

        this.controlBar = new ControlBar();

        setupSpotifyProxy();
        spotifyProxySignals.push(spotifyProxy.connect(
            "g-properties-changed",
            this._refresh.bind(this)
        ));
        this._refresh();
    }

    _initSettings() {
        settings = ExtensionUtils.getSettings();
        settingsSignals = [];

        lastExtensionPlace = settings.get_string('extension-place');
        lastExtensionIndex = settings.get_int('extension-index');

        settingsSignals.push(settings.connect(
            'changed::extension-place',
            this.onExtensionLocationChanged.bind(this)
        ));

        settingsSignals.push(settings.connect(
            'changed::extension-index',
            this.onExtensionLocationChanged.bind(this)
        ));

        settingsSignals.push(settings.connect(
            'changed::show-inactive',
            this._refresh.bind(this)
        ));
    }

    disable() {
        settingsSignals.forEach((signal) => settings.disconnect(signal));
        settingsSignals = null;

        settings = null;

        spotifyProxySignals.forEach((signal) => spotifyProxy.disconnect(signal));
        spotifyProxySignals = null;

        spotifyProxy = null;

        this.controlBar.destroy();
        hide = true;
    }

    _refresh() {
        if (spotifyProxy.isSpotifyOpen()) {
            if (hide) {
                // first time extension shows
                hide = false;
                this.onExtensionLocationChanged(settings);
            }

            this.controlBar.toggle[spotifyProxy.isPlaying() ? '_pauseIcon' : '_playIcon']();
        } else {
            hide = true;

            this.controlBar.toggle._playIcon();

            const newShowInactive = settings.get_boolean('show-inactive');

            if (newShowInactive !== showInactive) {
                showInactive = newShowInactive;
                if (showInactive) {
                    this.onExtensionLocationChanged(settings);
                }
            }

            if (!showInactive) {
                let removePanel = getPanel(lastExtensionPlace);
                this.controlBar._removeFrom(removePanel);
            }
        }
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
