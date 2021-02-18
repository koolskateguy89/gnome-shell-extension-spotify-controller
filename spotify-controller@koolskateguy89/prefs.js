const Gio = imports.gi.Gio;
const Gtk = imports.gi.Gtk;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

function init() {
}

function buildPrefsWidget() {

    let settings = ExtensionUtils.getSettings('org.gnome.shell.extensions.spotify-controller');

    let prefsWidget = new Gtk.Grid({
        margin: 18,
        column_spacing: 12,
        row_spacing: 12,
        visible: true,
        column_homogeneous: true,
    });

    let index = 0;

    let title = new Gtk.Label({
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    prefsWidget.attach(title, 0, index++, 1, 1);


	/* left-padding */
    let leftPaddingLabel = new Gtk.Label({
        label: 'Left padding:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(leftPaddingLabel, 0, index, 1, 1);

    let leftPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
        visible: true
    });
    prefsWidget.attach(leftPaddingEntry, 1, index++, 1, 1);


    /* right-padding */
    let rightPaddingLabel = new Gtk.Label({
        label: 'Right padding:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(rightPaddingLabel, 0, index, 1, 1);

    let rightPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
        visible: true
    });
    prefsWidget.attach(rightPaddingEntry, 1, index++, 1, 1);


    // TODO: fix update time
    /* update-time */
    /*let updateTimeLabel = new Gtk.Label({
        label: 'Check Spotify settings every: (seconds)',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(updateTimeLabel, 0, index, 1, 1);

    //let scale = Gtk.Scale.new_with_range(Gtk.Orientation.HORIZONTAL, 0.0, 60.0, 0.2);
    let scale = new Gtk.Scale ({
        orientation: Gtk.Orientation.HORIZONTAL,
        digits: 2,
        visible: true,
        adjustment: new Gtk.Adjustment({
            value: settings.get_double('update-time'),
            lower: 0.5,
            upper: 5.0,
            step_increment: 0.2,
            page_increment: 0.4
        })
    });
    /*let updateTimeEntry = new Gtk.Slider({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 60,
            step_increment: 1
        }),
        visible: true
    });* /
    prefsWidget.attach(scale, 1, index++, 1, 1);*/


    /* extension-place */
    let extensionPlaceLabel = new Gtk.Label({
        label: 'Extension place:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(extensionPlaceLabel, 0, index, 1, 1);

	let options = ['left', 'center', 'right'];
    let extensionPlaceComboBox = new Gtk.ComboBoxText({
    	halign: Gtk.Align.END,
    	visible: true
    });
    options.forEach(opt => extensionPlaceComboBox.append(opt, opt));
    /*for (let i = 0; i < options.length; i++) {
      extensionPlaceComboBox.append(options[i],  options[i]);
    }*/
    extensionPlaceComboBox.set_active(options.indexOf(settings.get_string('extension-place')));
    prefsWidget.attach(extensionPlaceComboBox, 1, index++, 1, 1);


    /* extension-index */
    let extensionIndexLabel = new Gtk.Label({
        label: 'Extension index:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(extensionIndexLabel, 0, index, 1, 1);

    let extensionIndexEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1
        }),
        visible: true
    });
    prefsWidget.attach(extensionIndexEntry, 1, index++, 1, 1);


    /* show-inactive */
    let showInactiveLabel = new Gtk.Label({
        label: 'Show when Spotify is closed:',
        halign: Gtk.Align.START,
        visible: true
    });
    prefsWidget.attach(showInactiveLabel, 0, index, 1, 1);

    let showInactiveSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true
    })
    prefsWidget.attach(showInactiveSwitch, 1, index++, 1, 1);


    settings.bind('left-padding', leftPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('right-padding', rightPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    //settings.bind('update-time', scale, 'value', Gio.SettingsBindFlags.DEFAULT);
    extensionPlaceComboBox.connect('changed', Lang.bind(this, function(widget) {
        settings.set_string('extension-place', options[widget.get_active()]);
    }));
    settings.bind('extension-index', extensionIndexEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('show-inactive', showInactiveSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);


    return prefsWidget;
}
