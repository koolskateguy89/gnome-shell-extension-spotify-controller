const { GLib, Gio, GObject, St } = imports.gi;

const ByteArray = imports.byteArray;
const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const schemaId = Me.metadata['settings-schema'];

//const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.spotify-controller');
const settings = (function() {  // basically copied from ExtensionUtils.getCurrentExtension() in recent Gnome Shell versions
    const GioSSS = Gio.SettingsSchemaSource;

    // Load schema
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false
    );

    let schemaObj = schemaSource.lookup(
        schemaId,
        true
    );

    if (!schemaObj)
        throw new Error(`Schema could not be found for extension ${Me.metadata.uuid}. Please check your installation`);

    // Load settings from schema
    return new Gio.Settings({ settings_schema: schemaObj });
})();

// variables to help
var lastExtensionPlace, lastExtensionIndex;
var showInactive, hide = true;

// signals
var onLeftPaddingChanged, onRightPaddingChanged;
var onExtensionPlaceChanged, onExtensionIndexChanged;
var onPrevIconColorChanged, onNextIconColorChanged;
var onPauseIconColorChanged, onPlayIconColorChanged;	// wow these variables have long names


const base = 'dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2';
const actionBase = base + ' org.mpris.MediaPlayer2.Player.';

// short status
//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'|egrep -A 1 \"string\"|cut -b 26-|cut -d '\"' -f 1|egrep -v ^$

//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'
const statusCMD = base + " org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'"

// Use grep & cut for hopefully faster string manipulation - nope it's slower most of the time
//const status = "sh -c \"" + base + " org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'|egrep -A 1 \\\"string\\\"|cut -b 26-|cut -d '\\\"' -f 1|egrep -v ^$\""

const toggleCMD = actionBase + 'PlayPause';
const nextCMD = actionBase + 'Next';
const prevCMD = actionBase + 'Previous';


function getStatus() {
	let [res, out, err, exitStatus] = [];
	try {
		//Use GLib to send a dbus request with the expectation of receiving an MPRIS v2 response.
		[res, out, err, exitStatus] = GLib.spawn_command_line_sync(statusCMD);

		out = ByteArray.toString(out).split("string ");

		if (!out[1])	// Spotify isn't open
			return;

		out = out[1];
		const secondSpMark = out.indexOf('"', 1);

		return out.substring(1, secondSpMark);

	} catch (err1) {
		// most likely Spotify not open - tbh idk if this is true
		//global.log("spotify-controller: error getting status: res: " + res + " -- exitStatus: " + exitStatus + " -- err:" + err);
		global.log('spotify-controller: ' + err1);
	}
}
function run(cmd) {
	let [res, out, err, exitStatus] = [];
	try {
		[res, out, err, exitStatus] = GLib.spawn_command_line_sync(cmd);
	} catch (err1) {
		// most likely Spotify not open - tbh idk if this is true
		//global.log("spotify-controller: error running command: res: " + res + " -- exitStatus: " + exitStatus + " -- err:" + err);
		global.log('spotify-controller: ' + err1);
	}
}
function nextSong() {
	run(nextCMD);
}
function previousSong() {
	run(prevCMD);
}
function toggle() {
	run(toggleCMD);
}

function isPlaying() {
	var status = getStatus();
	if (status)
		return (status === "Playing");

	// if we get here, most likely Spotify isn't open
}

function styleStr(direction, iconType) {
	return `
		padding-${direction}: ${settings.get_int(direction + "-padding")}px;
		color: ${settings.get_string(iconType + "-icon-color")};
		`;
}


const backward 	= 'media-skip-backward-symbolic';
const forward 	= 'media-skip-forward-symbolic';
const play 		= 'media-playback-start-symbolic';
const pause 	= 'media-playback-pause-symbolic';


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

        this.connect('button-press-event', () => { previousSong(); controlBar.toggle._pauseIcon(); });
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

        this.connect('button-press-event', () => { nextSong(); controlBar.toggle._pauseIcon(); });
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

		this.connect('button-press-event', this._toggle);
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

	_toggle(thisObj) {
		toggle();
		if (thisObj.icon_name === play) {
			thisObj._pauseIcon();
		} else {
			thisObj._playIcon();
		}
	}
});


const ControlBar = new Lang.Class({
	Name: 'SpotifyController-ControlBar',
	Extends: PanelMenu.Button,

	_init: function() {
		this.parent(0, 'SpotifyController-ControlBar');

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
	},

	_insertAt: function(box, index) {
		box.insert_child_at_index(this.container, index);
	},

	_removeFrom: function(box) {
		box.remove_actor(this.container);
	},

	destroy: function() {
		if (this.toggle._timeout) {
			this.toggle._removeTimeout();
		}

		this.previous.destroy();
		this.next.destroy();
		this.toggle.destroy();

		this.bar.destroy();
		this.parent(); //super.destroy();
	}
});

class Extension {
	constructor() {}	// do I need to define this???? - isn't it implicitly defined?

	enable() {
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
		//Main.panel.addToStatusArea('spotifycontrol-control-bar', this.controlBar, lastExtensionIndex, lastExtensionPlace);

		// andy.holmes is THE man - https://stackoverflow.com/a/59959242
		// poll editing extension location to be able to 'correctly' add to topbar (I have this extension on the left end of the rightBox (0, 'right')
		//   but some other extensions take that spot due to not specifying index (and probably other things idk) so this allows it to actually be where I want)
		//   on startup - although it'll probably lose it if you restart the shell)
		if (lastExtensionIndex == 0)
			GLib.timeout_add_seconds(GLib.PRIORITY_DEFAULT, 0, this.onExtensionLocationChanged.bind(this, settings));

		this._refresh();
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

		this.controlBar.destroy();
		hide = true;

		if (this._timeout) {
			Mainloop.source_remove(this._timeout);
			this._timeout = undefined;
		}
	}


	_refresh() {
		var playing = isPlaying();

		if (playing != null) {
			if (hide) {
				this.onExtensionLocationChanged(settings);
				hide = false;
			}
			if (playing) {
				this.controlBar.toggle._pauseIcon();
			} else {
				this.controlBar.toggle._playIcon();
			}
		} else {
			//global.log("spotify closed")
			//global.log(`hide: ${hide}`);

			hide = true;

			const newShowInactive = settings.get_boolean('show-inactive');

			if (newShowInactive !== showInactive) {
				showInactive = newShowInactive;
				if (showInactive) {
					this.onExtensionLocationChanged(settings);
				} else {
					var removePanel = getPanel(lastExtensionPlace);
					this.controlBar._removeFrom(removePanel);
				}
			}
		}

		this._removeTimeout();
		// settings.get_double('update-time')
		this._timeout = Mainloop.timeout_add_seconds(1, Lang.bind(this, this._refresh));
		return true;
	}

	_removeTimeout() {
		if (this._timeout) {
			Mainloop.source_remove(this._timeout);
			this._timeout = null;
		}
	}


	// Remove from old box & move to new box
	// USE THIS FOR ADDING TO TOP BAR
	onExtensionLocationChanged (settings, key) {
		const newExtensionPlace = settings.get_string('extension-place');
		const newExtensionIndex = settings.get_int('extension-index');

		var removeBox = getPanel(lastExtensionPlace);
		var insertBox = getPanel(newExtensionPlace);

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
	global.log(`\n\n\n${text}\n\n\n`);
}

function init() {
	return new Extension();
}
