const { Gio, Gtk, Gdk } = imports.gi;

const ExtensionUtils = imports.misc.extensionUtils;
const Me = ExtensionUtils.getCurrentExtension();
const settings = ExtensionUtils.getSettings();

const Config = imports.misc.config;
const [major] = Config.PACKAGE_VERSION.split('.');
const shellVersion = Number.parseInt(major);

if (shellVersion < 40) {
    Gtk.Box.prototype.append = function(widget) {
        this.add(widget);
    }
}

String.prototype.toRgba = function() {
    const rgba = new Gdk.RGBA();
    rgba.parse(this.valueOf());
    return rgba;
}

let extensionPlaceComboBox;

let prevColorButton, nextColorButton, pauseColorButton, playColorButton, sameColorsSwitch;

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
    });
    box.append(title);

    let prefsWidget = new Gtk.Grid({
        ...{
            column_spacing: 12,
            row_spacing: 12,
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
    box.append(prefsWidget);

    let index = 0;

    /* left-padding */
    let leftPaddingLabel = new Gtk.Label({
        label: 'Left padding:',
        halign: Gtk.Align.START,
    });

    let leftPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
    });

    prefsWidget.attach(leftPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(leftPaddingEntry, 1, index, 1, 1);


    /* right-padding */
    let rightPaddingLabel = new Gtk.Label({
        label: 'Right padding:',
        halign: Gtk.Align.START,
    });

    let rightPaddingEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 200,
            step_increment: 1
        }),
    });

    index++;
    prefsWidget.attach(rightPaddingLabel, 0, index, 1, 1);
    prefsWidget.attach(rightPaddingEntry, 1, index, 1, 1);


    // TODO: fix update time?
    /* update-time */
    /*let updateTimeLabel = new Gtk.Label({
        label: 'Check Spotify settings every: (seconds)',
        halign: Gtk.Align.START,
    });

    let updateTimeEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 1,
            upper: 60,
            step_increment: 1
        }),
    });

    index++;
    prefsWidget.attach(updateTimeLabel, 0, index, 1, 1);
    prefsWidget.attach(updateTimeEntry, 1, index, 1, 1);
    */


    /* extension-place */
    let extensionPlaceLabel = new Gtk.Label({
        label: 'Extension place:',
        halign: Gtk.Align.START,
    });

    let options = ['left', 'center', 'right'];
    extensionPlaceComboBox = new Gtk.ComboBoxText({
        halign: Gtk.Align.END,
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
    });

    let extensionIndexEntry = new Gtk.SpinButton({
        adjustment: new Gtk.Adjustment({
            lower: 0,
            upper: 20,
            step_increment: 1
        }),
    });

    index++;
    prefsWidget.attach(extensionIndexLabel, 0, index, 1, 1);
    prefsWidget.attach(extensionIndexEntry, 1, index, 1, 1);


    /* show-inactive */
    let showInactiveLabel = new Gtk.Label({
        label: 'Show when Spotify is closed:',
        halign: Gtk.Align.START,
    });

    let showInactiveSwitch = new Gtk.Switch({
        valign: Gtk.Align.END,
        halign: Gtk.Align.END,
    });

    index++;
    prefsWidget.attach(showInactiveLabel, 0, index, 1, 1);
    prefsWidget.attach(showInactiveSwitch, 1, index, 1, 1);


    /* icon-color */
    let colorGrid = buildColorGrid();
    index++;
    prefsWidget.attach(colorGrid, 0, index, 2, 1);


    settings.bind('left-padding', leftPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('right-padding', rightPaddingEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    //settings.bind('update-time', updateTimeEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    extensionPlaceComboBox.connect('changed', (widget) => {
        settings.set_string('extension-place', options[widget.get_active()]);
    });
    settings.bind('extension-index', extensionIndexEntry, 'value', Gio.SettingsBindFlags.DEFAULT);
    settings.bind('show-inactive', showInactiveSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);


    let defaultButton = buildDefaultButton();
    box.append(defaultButton);

    return box;
}

function buildColorGrid() {
    let colorGrid = new Gtk.Grid({
        ...{
            column_spacing: 12,
            row_spacing: 12,
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
    });

    prevColorButton = new Gtk.ColorButton();
    prevColorButton.set_rgba(settings.get_string('prev-icon-color').toRgba());

    colorGrid.attach(prevColorLabel, 0, 0, 1, 1);
    colorGrid.attach(prevColorButton, 1, 0, 1, 1);


    /* next-icon-color */
    let nextColorLabel = new Gtk.Label({
        label: 'Next Icon color:',
        halign: Gtk.Align.START,
    });

    nextColorButton = new Gtk.ColorButton({
    });
    nextColorButton.set_rgba(settings.get_string('next-icon-color').toRgba());

    colorGrid.attach(nextColorLabel, 0, 1, 1, 1);
    colorGrid.attach(nextColorButton, 1, 1, 1, 1);


    /* pause-icon-color */
    let pauseColorLabel = new Gtk.Label({
        label: 'Pause Icon color:',
        halign: Gtk.Align.START,
    });

    pauseColorButton = new Gtk.ColorButton();
    pauseColorButton.set_rgba(settings.get_string('pause-icon-color').toRgba());

    colorGrid.attach(pauseColorLabel, 0, 2, 1, 1);
    colorGrid.attach(pauseColorButton, 1, 2, 1, 1);


    /* play-icon-color */
    let playColorLabel = new Gtk.Label({
        label: 'Play Icon color:',
        halign: Gtk.Align.START,
    });

    playColorButton = new Gtk.ColorButton();
    playColorButton.set_rgba(settings.get_string('play-icon-color').toRgba());

    colorGrid.attach(playColorLabel, 0, 3, 1, 1);
    colorGrid.attach(playColorButton, 1, 3, 1, 1);


    prevColorButton.connect('color-set', (widget) => {
        const color = widget.get_rgba().to_string();
        // prevColorLabel.label = `prev=[${color}]`;    // debug
        settings.set_string('prev-icon-color', color);
    });

    nextColorButton.connect('color-set', (widget) => {
        const color = widget.get_rgba().to_string();
        // nextColorLabel.label = `next=[${color}]`;    // debug
        settings.set_string('next-icon-color', color);
    });

    pauseColorButton.connect('color-set', (widget) => {
        const color = widget.get_rgba().to_string();
        // pauseColorLabel.label = `pause=[${color}]`;    // debug
        settings.set_string('pause-icon-color', color);
    });

    playColorButton.connect('color-set', (widget) => {
        const color = widget.get_rgba().to_string();
        // playColorLabel.label = `play=[${color}]`;    // debug
        settings.set_string('play-icon-color', color);
    });


    /* same-color-buttons */
    let sameColorsLabel = new Gtk.Label({
        label: 'Same Icon colors (uses previous icon color):',
        halign: Gtk.Align.START,
    });

    sameColorsSwitch = new Gtk.Switch({
        halign: Gtk.Align.START,
    });
    settings.bind('same-color-buttons', sameColorsSwitch, 'active', Gio.SettingsBindFlags.DEFAULT);

    colorGrid.attach(sameColorsLabel, 0, 4, 1, 1);
    colorGrid.attach(sameColorsSwitch, 1, 4, 1, 1);

    return colorGrid;
}

function buildDefaultButton() {
    let button = new Gtk.Button({
        label: "Reset to default",
    });

    button.connect('clicked', () => {
        settings.reset('left-padding');
        settings.reset('right-padding');

        settings.reset('extension-index');
        let options = ['left', 'center', 'right'];
        extensionPlaceComboBox.set_active(options.indexOf(settings.get_string('extension-place')));

        settings.reset('show-inactive');

        const white = 'white'.toRgba();

        const colorBtns = [
            prevColorButton,
            nextColorButton,
            pauseColorButton,
            playColorButton,
        ];

        for (const btn of colorBtns) {
            btn.set_rgba(white);
            btn.emit('color-set');
        }

        settings.reset('same-color-buttons');
    });

    return button;
}
