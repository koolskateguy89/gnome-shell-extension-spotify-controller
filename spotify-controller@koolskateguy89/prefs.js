const { Gio, Gtk, Gdk } = import.gi;
const Lang = imports.lang;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

// ~/Projects/Gnome-Extensions/gnome-shell-extension-spotify-controller

const settings = (function() {  // basically copied from ExtensionUtils.getCurrentExtension() in recent Gnome Shell versions
    const GioSSS = Gio.SettingsSchemaSource;

    // Load schema
    let schemaSource = GioSSS.new_from_directory(
        Me.dir.get_child('schemas').get_path(),
        GioSSS.get_default(),
        false
    );

    let schemaObj = schemaSource.lookup(
        'org.gnome.shell.extensions.spotify-controller',
        true
    );

    if (!schemaObj)
        throw new Error(`Schema could not be found for extension ${Me.metadata.uuid}. Please check your installation`);

    // Load settings from schema
    return new Gio.Settings({ settings_schema: schemaObj });
})();


var extensionPlaceComboBox;

var prevColorButton, nextColorButton, pauseColorButton, playColorButton;


function init() {
}

function buildPrefsWidget() {

    let box = new Gtk.Box({
        ...{
            orientation: Gtk.Orientation.VERTICAL,
            spacing: 1,
        },
        ...(shellVersion >= 40 ?
            {
                margin_top: 20,
                margin_bottom: 20,
                margin_start: 20,
                margin_end: 20,
            }
            :
            {
                border_width: 20,
            }
        ),
    });

    let title = new Gtk.Label({
        label: '<b>' + Me.metadata.name + ' Extension Preferences</b>',
        halign: Gtk.Align.START,
        use_markup: true,
        visible: true
    });
    box.add(title);

    let prefsWidget = new Gtk.Grid({
        ...{
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            column_homogeneous: true,
        },
        ...(shellVersion >= 40 ?
            {
                margin_top: 18,
                margin_bottom: 18,
                margin_start: 18,
                margin_end: 18,
            }
            :
            {
                margin: 18,
            }
        ),
    });
    box.add(prefsWidget);

    let index = 0;

    /* left-padding */
    let leftPaddingLabel = new Gtk.Label({
        label: 'Left padding:',
        halign: Gtk.Align.START,
        visible: true
    });

    let leftPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
        visible: true
    });

    prefsWidget.attach(leftPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(leftPaddingEntry, 1, index, 1, 1);


    /* right-padding */
    let rightPaddingLabel = new Gtk.Label({
        label: 'Right padding:',
        halign: Gtk.Align.START,
        visible: true
    });

    let rightPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(rightPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(rightPaddingEntry, 1, index, 1, 1);


    // TODO: fix update time
    /* update-time */
    /*let updateTimeLabel = new Gtk.Label({
        label: 'Check Spotify settings every: (seconds)',
        halign: Gtk.Align.START,
        visible: true
    });

    let updateTimeEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 60,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(updateTimeLabel, 0, index, 1, 1);
    prefsWidget.attach(updateTimeEntry, 1, index, 1, 1);
    */


    /* extension-place */
    let extensionPlaceLabel = new Gtk.Label({
        label: 'Extension place:',
        halign: Gtk.Align.START,
        visible: true
    });

    let options = ['left', 'center', 'right'];
    extensionPlaceComboBox = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
        visible: true
    });
    options.forEach(opt => extensionPlaceComboBox.append(opt, opt));
    extensionPlaceComboBox.set_active(options.indexOf(settings.get_string('extension-place')));

    index++;
    prefsWidget.attach(extensionPlaceLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionPlaceComboBox, 1, index, 1, 1);


    /* extension-index */
    let extensionIndexLabel = new Gtk.Label({
        label: 'Extension index:',
        halign: Gtk.Align.START,
        visible: true
    });

    let extensionIndexEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1
        }),
        visible: true
    });

    index++;
    prefsWidget.attach(extensionIndexLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionIndexEntry, 1, index, 1, 1);


    /* show-inactive */
    let showInactiveLabel = new Gtk.Label({
        label: 'Show when Spotify is closed:',
        halign: Gtk.Align.START,
        visible: true
    });

    let showInactiveSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
        visible: true
    });

    index++;
    prefsWidget.attach(showInactiveLabel, 0, index, 1, 1);
    prefsWidget.attach(showInactiveSwitch, 1, index, 1, 1);


    /* *-icon-color */
    let colorGrid = buildColorGrid();
    index++;
    prefsWidget.attach(colorGrid, 0, index, 1, 1);


    settings.bind('left-padding', leftPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('right-padding', rightPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    //settings.bind('update-time', updateTimeEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    extensionPlaceComboBox.connect('changed', (widget) => {
        settings.set_string('extension-place', options[widget.get_active()]);
    });
    settings.bind('extension-index', extensionIndexEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('show-inactive', showInactiveSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);


    let defaultButton = buildDefaultButton();
    box.pack_end(defaultButton, false, false, 0);

    box.show_all();

    return box;
}

function buildColorGrid() {

    let colorGrid = new Gtk.Grid({
        ...{
            column_spacing: 12,
            row_spacing: 12,
            visible: true,
            column_homogeneous: true,
        },
        ...(shellVersion >= 40 ?
            {
                margin_top: 12,
                margin_bottom: 12,
                margin_start: 12,
                margin_end: 12,
            }
            :
            {
                margin: 12,
            }
        )
    });

    /* prev-icon-color */
    let prevColorLabel = new Gtk.Label({
        label: 'Previous Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    prevColorButton = new Gtk.ColorButton({
        visible: true,
    });
    prevColorButton.set_color(Gdk.Color.parse(settings.get_string('prev-icon-color'))[1]);

    colorGrid.attach(prevColorLabel, 0, 0, 1, 1);
    colorGrid.attach(prevColorButton, 1, 0, 1, 1);


    /* next-icon-color */
    let nextColorLabel = new Gtk.Label({
        label: 'Next Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    nextColorButton = new Gtk.ColorButton({
        visible: true,
    });
    nextColorButton.set_color(Gdk.Color.parse(settings.get_string('next-icon-color'))[1]);

    colorGrid.attach(nextColorLabel, 0, 1, 1, 1);
    colorGrid.attach(nextColorButton, 1, 1, 1, 1);


    /* pause-icon-color */
    let pauseColorLabel = new Gtk.Label({
        label: 'Pause Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    pauseColorButton = new Gtk.ColorButton({
        visible: true,
    });
    pauseColorButton.set_color(Gdk.Color.parse(settings.get_string('pause-icon-color'))[1]);

    colorGrid.attach(pauseColorLabel, 0, 2, 1, 1);
    colorGrid.attach(pauseColorButton, 1, 2, 1, 1);


    /* play-icon-color */
    let playColorLabel = new Gtk.Label({
        label: 'Play Icon color:',
        halign: Gtk.Align.START,
        visible: true,
    });

    playColorButton = new Gtk.ColorButton({
        visible: true,
    });
    playColorButton.set_color(Gdk.Color.parse(settings.get_string('play-icon-color'))[1]);

    colorGrid.attach(playColorLabel, 0, 3, 1, 1);
    colorGrid.attach(playColorButton, 1, 3, 1, 1);


    prevColorButton.connect('color-set', (widget) => {
        const color = widget.get_color().to_string();
        prevColorLabel.label = `[${parseHex(color)}]`;    // for debug
        settings.set_string('prev-icon-color', parseHex(color));
    });

    nextColorButton.connect('color-set', (widget) => {
        const color = widget.get_color().to_string();
        settings.set_string('next-icon-color', parseHex(color));
    });

    pauseColorButton.connect('color-set', (widget) => {
        const color = widget.get_color().to_string();
        settings.set_string('pause-icon-color', parseHex(color));
    });

    playColorButton.connect('color-set', (widget) => {
        const color = widget.get_color().to_string();
        settings.set_string('play-icon-color', parseHex(color));
    });


    return colorGrid;
}

// parse 12-digit hex (given by Gdk.Color) to 6-digit needed for CSS - some accuracy WILL be lost
function parseHex(hex = '#000000') {
    if (hex.length == 7)
        return hex;

    // split color into its constituent parts
    var red = hex.substring(1, 5);
    var green = hex.substring(5, 9);
    var blue = hex.substring(9);

    // convert hex strings to ints
    red = parseInt(red, 16);
    green = parseInt(green, 16);
    blue = parseInt(blue, 16);

    // divide by 16^2 to try and 'simulate' 16^4 bits -> 16^2 bits
    red = Math.floor(red / 256);
    green = Math.floor(green / 256);
    blue = Math.floor(blue / 256);

    // convert back to hex strings
    red = red.toString(16);
    green = green.toString(16);
    blue = blue.toString(16);

    // 'inflate' single digit hex
    if (red.length < 2)
        red = '0' + red;
    if (green.length < 2)
        green = '0' + green;
    if (blue.length < 2)
        blue = '0' + blue;


    return `#${red}${green}${blue}`;
}

function buildDefaultButton() {
    let button = new Gtk.Button({
        label: "Reset to default",
    });

    button.connect('clicked', () => {
        settings.set_int('left-padding', 0);
        settings.set_int('right-padding', 0);

        extensionPlaceComboBox.set_active(1);   // center
        settings.set_int('extension-index', 0);

        settings.set_boolean('show-inactive', false);

        const white = Gdk.Color.parse('white')[1];

        prevColorButton.set_color(white); prevColorButton.emit('color-set');
        nextColorButton.set_color(white); nextColorButton.emit('color-set');
        pauseColorButton.set_color(white); pauseColorButton.emit('color-set');
        playColorButton.set_color(white); playColorButton.emit('color-set');
    });

    return button;
}
