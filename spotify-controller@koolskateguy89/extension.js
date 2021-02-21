const { Clutter, GLib, GObject, St } = imports.gi;

const Lang = imports.lang;
const Mainloop = imports.mainloop;
const Main = imports.ui.main;
const PanelMenu = imports.ui.panelMenu;
const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.spotify-controller');


// variables to help
var lastExtensionPlace, lastExtensionIndex;
var onLeftPaddingChanged, onRightPaddingChanged;
var onExtensionPlaceChanged, onExtensionIndexChanged;


const base = 'dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2';
const actionBase = base + ' org.mpris.MediaPlayer2.Player.';

// short status
//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'|egrep -A 1 \"string\"|cut -b 26-|cut -d '\"' -f 1|egrep -v ^$
// Next
//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.mpris.MediaPlayer2.Player.Next

//dbus-send --print-reply --dest=org.mpris.MediaPlayer2.spotify /org/mpris/MediaPlayer2 org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'
const status = base + " org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'PlaybackStatus'" // |egrep -A 1 \"string\"|cut -b 26-|cut -d '\"' -f 1|egrep -v ^$
//const song = base + " org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'Metadata'|egrep -A 1 \"title\"|egrep -v \"title\"|cut -b 44-|cut -d '\"' -f 1|egrep -v ^$"
//const artist = base + " org.freedesktop.DBus.Properties.Get string:'org.mpris.MediaPlayer2.Player' string:'Metadata'|egrep -A 2 \"artist\"|egrep -v \"artist\"|egrep -v \"array\"|cut -b 27-|cut -d '\"' -f 1|egrep -v ^$"

const toggleCMD = actionBase + 'PlayPause';
const nextCMD = actionBase + 'Next';
const prevCMD = actionBase + 'Previous';

function getStatus() {
	let [res, out, err, exitStatus] = [];
	try {
		//Use GLib to send a dbus request with the expectation of receiving an MPRIS v2 response.
		[res, out, err, exitStatus] = GLib.spawn_command_line_sync(status);
		try {
			return out.toString().split("string ")[1].split('"').join("").trim(); // .split.join is replaceAll
		} catch (err2) {
			global.log(err2);
			return undefined;
		}
	} catch (err) {
		// most likely Spotify not open
		//global.log("spotify-controller: error getting status: res: " + res + " -- exitStatus: " + exitStatus + " -- err:" + err);
	}
}
function run(cmd) {
	let [res, out, err, exitStatus] = [];
	try {
		[res, out, err, exitStatus] = GLib.spawn_command_line_sync(cmd);
	} catch (err) {
		// most likely Spotify not open
		//global.log("spotify-controller: error editing song: res: " + res + " -- exitStatus: " + exitStatus + " -- err:" + err);
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
	var _status = getStatus();
	if (_status) {
		return (_status === "Playing");
	}
	// if it gets to here, most likely Spotify not open
	//global.log("controlspotify: bad status");
	return null;
}

function padStr(direction) {
	return `padding-${direction}: ${settings.get_int(direction+"-padding")}px; `;
}


const backward = 'media-skip-backward-symbolic';
const forward = 'media-skip-forward-symbolic';
const play = 'media-playback-start-symbolic';
const pause = 'media-playback-pause-symbolic';

// TODO: fix & finish:
//const red = new Clutter.ColorizeEffect(Clutter.Color.get_static(Clutter.StaticColor.RED));
//const green = new Clutter.ColorizeEffect(Clutter.Color.get_static(Clutter.StaticColor.GREEN));

var Previous = GObject.registerClass(
class Previous extends St.Icon {
	_init(controlBar) {
		super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: backward,
            style_class: 'system-status-icon',
            style: padStr('left')
        });

		// Listen for update of left padding in settings
        onLeftPaddingChanged = settings.connect(
			'changed::left-padding',
			this._leftPaddingChanged.bind(this)
		);

        this.connect('button-press-event', () => {previousSong(); controlBar.toggle._playIcon()});
	}

	_leftPaddingChanged(settings) {
		this.set_style(padStr('left'));
	}
});

var Next = GObject.registerClass(
class Next extends St.Icon {
	_init(controlBar) {
		super._init({
            track_hover: true,
            can_focus: true,
            reactive: true,
            icon_name: forward,
            style_class: 'system-status-icon',
            style: padStr('right')
        });

		// Listen for update of right padding in settings
        onRightPaddingChanged = settings.connect(
			'changed::right-padding',
			this._rightPaddingChanged.bind(this)
		);

        this.connect('button-press-event', () => {nextSong(); controlBar.toggle._playIcon()});
	}

	_rightPaddingChanged(settings) {
		this.set_style(padStr('right'));
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
            style_class: 'system-status-icon'
        });

		this.connect('button-press-event', this._toggle);
	}

	_pauseIcon() {
		this.icon_name = pause;
		//global.log('\nto red')
		//this.clear_effects();
		//this.add_effect(red);
	}

	_playIcon() {
		this.icon_name = play;
		//global.log('\nto green')
		//this.clear_effects();
		//this.add_effect(green);
	}

	// for some reason if I try using this.[...], it gives
	// JS ERROR: TypeError: this is null
	_toggle(thisObj) {
		toggle();
		if (thisObj.icon_name === play) {
			thisObj.icon_name = pause;
		} else {
			thisObj.icon_name = play;
		}
	}
});


var ControlBar = GObject.registerClass(
class ControlBar extends PanelMenu.Button {
	_init() {
		super._init(0.0, 'SpotifyController-ControlBar');

		this.previous = new Previous(this);

		this.next = new Next(this);

		this.toggle = new Toggle();

		this.controlBar = new St.BoxLayout();

		this.controlBar.add_child(this.previous);
		this.controlBar.add_child(this.toggle);
		this.controlBar.add_child(this.next);

		this.add_child(this.controlBar);
	}

	_insertAt(box, index) {
		box.insert_child_at_index(this.container, index);
	}

	_removeFrom(box) {
		box.remove_actor(this.container);
	}

	_destroy() {
		if (this.toggle._timeout) {
			this.toggle._removeTimeout();
		}

		this.previous.destroy();
		this.next.destroy();
		this.toggle.destroy();

		this.controlBar.destroy();
		super.destroy();
	}
});

var hide = true;

class Extension {
	constructor() {}

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

		this._refresh();
	}

	disable() {
		settings.disconnect(onLeftPaddingChanged);
		settings.disconnect(onRightPaddingChanged);
		settings.disconnect(onExtensionPlaceChanged);
		settings.disconnect(onExtensionIndexChanged);

		this.controlBar._destroy();

		if (this._timeout) {
			Mainloop.source_remove(this._timeout);
			this._timeout = undefined;
		}
	}


	_refresh() {
		var playing = isPlaying();

		if (playing != null) {
			if (hide) {
				var insertBox = getPanel(lastExtensionPlace);
				//debug(`Index: ${-lastExtensionIndex}`);
				this.controlBar._insertAt(insertBox, lastExtensionIndex);
				hide = false;
			}
			if (playing) {
				this.controlBar.toggle._pauseIcon();
			} else {
				this.controlBar.toggle._playIcon();
			}
		} else {
			if (!hide) {
				hide = true;
				var show_inactive = settings.get_boolean('show-inactive');
				if (!show_inactive) {
					var removePanel = getPanel(lastExtensionPlace);
					this.controlBar._removeFrom(removePanel);
				}
			}
		}

		//global.log(`hide: ${hide} Inact: ${settings.get_boolean('show-inactive')}`);
		//global.log('');

		this._removeTimeout();
		// settings.get_double('update-time')
		this._timeout = Mainloop.timeout_add_seconds(.8, Lang.bind(this, this._refresh));
		return true;
	}

	_removeTimeout() {
		if (this._timeout) {
			Mainloop.source_remove(this._timeout);
			this._timeout = null;
		}
	}


	// Remove from old box & move to new box
	onExtensionLocationChanged (settings, key) {
		const newExtensionPlace = settings.get_string('extension-place');
		const newExtensionIndex = settings.get_int('extension-index');

		var removeBox = getPanel(lastExtensionPlace);
		var insertBox = getPanel(newExtensionPlace);

		this.controlBar._removeFrom(removeBox);
		if (!hide)
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
