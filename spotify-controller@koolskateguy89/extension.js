// GNOME APIs are under the `gi` namespace (except Cairo)
// See: https://gjs-docs.gnome.org/
const { Gio, GObject, St } = imports.gi;

// GNOME Shell imports
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const MediaPlayer = Me.imports.mediaPlayer;

// helper variables
let lastExtensionPlace, lastExtensionIndex;
let showInactive;
let hide = true;

// signals
let settingsSignals;

const backward  = 'media-skip-backward-symbolic';
const forward   = 'media-skip-forward-symbolic';
const play      = 'media-playback-start-symbolic';
const pause     = 'media-playback-pause-symbolic';

let settings;


function styleStr(direction, iconType) {
    let style;
    if (iconType) {
        style = `padding-${direction}: ${settings.get_int(`${direction}-padding`)}px;`
    } else {
        // called by toggle
        style = '';
        iconType = direction;
    }

    const useSameColors = settings.get_boolean('same-color-buttons');
    iconType = useSameColors ? 'prev' : iconType;
    style += `color: ${settings.get_string(`${iconType}-icon-color`)};`

    return style;
}

const Previous = GObject.registerClass(
class Previous extends St.Icon {
    _init(spotify, controlBar) {
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
                spotify.previous();
            }
        });
    }

    _styleChanged() {
        this.set_style(styleStr('left', 'prev'));
    }
});

const Next = GObject.registerClass(
class Next extends St.Icon {
    _init(spotify) {
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
                spotify.next();
            }
        });
    }

    _styleChanged() {

        this.set_style(styleStr('right', 'next'));
    }
});

const Toggle = GObject.registerClass(
class Toggle extends St.Icon {
    _init(spotify) {
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
                spotify.playPause();
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
    _init(spotify) {
        super._init();

        this.previous = new Previous(spotify, this);

        this.next = new Next(spotify);

        this.toggle = new Toggle(spotify);

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

        const refresh = this._refresh.bind(this);
        this.spotify = new MediaPlayer.MediaPlayer(refresh, refresh, refresh);
        this.spotify.setupProxy();

        this.controlBar = new ControlBar(this.spotify);

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

        this.spotify.destroy();

        this.controlBar.destroy();
        hide = true;
    }

    _refresh() {
        if (this.spotify.isActive) {
            if (hide) {
                // first time extension shows
                log(`Showing spotify-controller: Spotify owner vanished`);
                hide = false;
                this.onExtensionLocationChanged(settings);
            }

            this.controlBar.toggle[this.spotify.isPlaying ? '_pauseIcon' : '_playIcon']();
        } else {
            log(`Hiding spotify-controller: Spotify owner disappeared`);
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
