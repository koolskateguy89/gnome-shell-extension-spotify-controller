const { Gio } = imports.gi;

// thanks esenliyim - https://github.com/esenliyim/sp-tray/blob/master/dbus.js
// https://wiki.gnome.org/Gjs/Examples/DBusClient
// https://www.andyholmes.ca/articles/dbus-in-gjs.html#high-level-proxies
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
const PlayerProxy = Gio.DBusProxy.makeProxyWrapper(playerInterface);

/**
 * A Gio.DBuxProxy of the `org.mpris.MediaPlayer2.Player` interface.
 * @typedef {Object} MediaPlayerProxy
 * @property {string} PlaybackStatus
 */

/**
 * @callback playerConsumer
 * @param {MediaPlayer} player
 */

/**
 * A non-player specific wrapper of a proxy for a media player.
 *
 * onAppeared
 * onVanished
 * onPropertiesChanged
 * proxy
 * proxySignals
 *
 * @todo Write the documentation.
 */
var MediaPlayer = class MediaPlayer {
    /**
     * @param {playerConsumer=} onAppeared
     * @param {playerConsumer=} onVanished
     * @param {playerConsumer=} onPropertiesChanged
     */
    constructor(onAppeared, onVanished, onPropertiesChanged) {
        this.onAppeared = onAppeared;
        this.onVanished = onVanished;
        this.onPropertiesChanged = onPropertiesChanged;

        this.proxy = null;
        this.proxySignals = [];
    }

    /**
     * @param {string} dest - The well-known name
     */
    setupProxy(dest = 'org.mpris.MediaPlayer2.spotify') {
        if (this.proxy)
            return;

        try {
            // Get the MediaPlayer instance from the bus
            this.proxy = new PlayerProxy(Gio.DBus.session, dest, path);
        } catch (e) {
            logError(e);
            return;
        }

        this.proxySignals.push(this.proxy.connect(
            "g-properties-changed",
            (proxy, changed, invalidated) => {
                this.onPropertiesChanged?.(this);
            }
        ));

        // https://www.andyholmes.ca/articles/dbus-in-gjs.html#low-level-proxies
        this.proxySignals.push(this.proxy.connect(
            "notify::g-name-owner",
            (proxy, pspec) => {
                if (proxy.g_name_owner === null) {
                    log(`${proxy.g_name} has vanished`);
                    this.onVanished?.(this);
                } else {
                    log(`${proxy.g_name} has appeared`);
                    this.onAppeared?.(this);
                }
            }
        ));
    }

    destroy() {
        this.proxySignals.forEach(signal => this.proxy.disconnect(signal));
    }

    get isActive() {
        return this.proxy.g_name_owner !== null;
    }

    get isPlaying() {
        return this.isActive && this.proxy.PlaybackStatus === 'Playing';
    }

    next() {
        this.proxy.NextSync();
    }

    previous() {
        this.proxy.PreviousSync();
    }

    playPause() {
        this.proxy.PlayPauseSync();
    }
}
