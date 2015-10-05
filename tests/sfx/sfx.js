// output format
// 00
// 2 speed
// 2 loop start
// 2 loop end
// [4]
//     2 freq
//     1 instrument
//     1 vol



/////////////////
// OSCILLATORS //
/////////////////

function AdditionalWavesInstrumentPack(name, audioContext) {
    var types = ['pulse', 'bezier', 'bezier2'];

    if (types.indexOf(name) === -1) {
        throw new Error(name + ' is not a valid AdditionaWave type');
    }

    return {
        createNote: function(destination, frequency) {
            var o = audioContext.createOscillator();
            var real, imag, table;

            switch (name) {
                case 'pulse':
                    var real = new Float32Array([1, 0, 0.32, 0, 0.20, 0, 0.14, 0, 0.116, 0, 0.093, 0, 0.078, 0, 0.068, 0, 0.061, 0, 0.053, 0, 0.051, 0, 0.044, 0, 0.044, 0, 0.042, 0, 0.036, 0, 0.036, 0, 0.034, 0, 0.036, 0, 0.036, 0, 0.036, 0, 0.035, 0, 0.034, 0, 0.027, 0, 0.025, 0, 0.024, 0]);
                    var imag = new Float32Array(real.length);
                    var table = audioContext.createPeriodicWave(real, imag);
                    o.setPeriodicWave(table)
                    break;
                case 'bezier':
                    var real = new Float32Array([1, 0, 0.12, 0, 0.04, 0, 0.016, 0, 0.004, 0]);
                    var imag = new Float32Array(real.length);
                    var table = audioContext.createPeriodicWave(real, imag);
                    o.setPeriodicWave(table)
                    break;
                case 'bezier2':
                    var real = new Float32Array([0.994, 1, 0.916, 0.402, 0.045, 0.031, 0.039, 0.045, 0.017, 0.007, 0.006, 0.005]);
                    var imag = new Float32Array(real.length);
                    var table = audioContext.createPeriodicWave(real, imag);
                    o.setPeriodicWave(table)
                    break;
            }
            o.connect(destination);
            o.frequency.value = frequency;

            return o;
        }
    };
}

///////////
// UTILS //
///////////
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.toLowerCase());

    return result ? [
        parseInt(result[1], 16),
        parseInt(result[2], 16),
        parseInt(result[3], 16)
    ] : [0, 0, 0];
}

////////////////
// SFX EDITOR //
////////////////

var CANVAS_WIDTH  = 160;
var CANVAS_HEIGHT = 144;

var CANVAS_BG_COLOR = '#000000';

var BAR_COLOR       = hexToRgb('#A6A7AD');
var BAR_NUM         = 32;
var BAR_MAX_VAL     = 4000;
var BAR_TYPE_COLORS = [hexToRgb('#FB002B'), hexToRgb('#FD8208'), hexToRgb('#FFF300'), hexToRgb('#21EB2E'), hexToRgb('#1B83FF'), hexToRgb('#5C4B79'), hexToRgb('#FC3D85'), hexToRgb('#FDB385')];
var BAR_TYPES       = ['sine', 'square', 'sawtooth', 'triangle', 'white', 'pulse', 'bezier', 'bezier2'];
var BAR_TYPES_PACKS = {
    'white':  'noises',
    'pulse':  'morewaves',
    'bezier': 'morewaves',
    'bezier2': 'morewaves'
}
var BAR_UI_PERCENTAGE    = 70;
var BAR_TYPE_DEFAULT     = 0;

var VOLUME_COLOR         = BAR_COLOR;
var VOLUME_UI_PERCENTAGE = 25;
var VOLUME_DEFAULT       = 7;
var VOLUME_MAX_VAL       = 7;

var OCTAVES = 8;
var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

var bars;
var barWidth;
var barType;
var barUiHeight;
var barUiSpaceBetweenScreens;
var barDrawing;

var volumeDrawing;
var volumeUiHeight;
var volumeStep;

var canvas;
var ctx;
var retroScreen;

var notes;
var barNoteStep;


var sfxPlayer;
var sfxPlayerWaves;

var tempo = 200;

//////////
// CORE //
//////////
function init() {
    canvas        = document.createElement('canvas');
    canvas.width  = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    document.body.appendChild(canvas);

    ctx           = canvas.getContext("2d");
    ctx.fillStyle = CANVAS_BG_COLOR;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    barDrawing    = false;
    volumeDrawing = false;

    canvas.onmousedown = function (e) {
        if ((e.layerY / 4) < barUiHeight) barDrawing = true;
        if ((e.layerY / 4) > barUiHeight + barUiSpaceBetweenScreens) volumeDrawing = true;

        canvas.onmousemove(e);
    };

    canvas.onmouseup = function (e) {
        barDrawing = false;
        volumeDrawing = false;
    };

    canvas.onmouseout = function (e) {
        barDrawing = false;
        volumeDrawing = false;
    }

    canvas.onmousemove = function(e){
        var bar     = Math.floor((e.layerX / 4) / barWidth) / 2;
        var isOnBar = bar === Math.floor(bar);

        if (barDrawing) {
            if ((e.layerY / 4) >= barUiHeight || !isOnBar) return;
            var frequency = Math.max(3, ((BAR_MAX_VAL * (barUiHeight - (e.layerY / 4))) / barUiHeight));
            var note      = Math.floor(frequency / barNoteStep);

            bars[bar] = [note, barType, bars[bar][2]];
            draw();
        }

        if (volumeDrawing) {
            if (!isOnBar) return;
            var newVolume = Math.floor((volumeUiHeight - ((e.layerY / 4) - (barUiHeight + barUiSpaceBetweenScreens))) / volumeStep);
            if (newVolume > VOLUME_MAX_VAL) newVolume = VOLUME_MAX_VAL;
            bars[bar] =  [bars[bar][0], bars[bar][1],  newVolume];
            draw();
        }
    }

    retroScreen = new RetroScreen(canvas);
    retroScreen.retroDisplay.canvas.onmousemove = canvas.onmousemove;
    retroScreen.retroDisplay.canvas.onmouseout = canvas.onmouseout;
    retroScreen.retroDisplay.canvas.onmouseup = canvas.onmouseup;
    retroScreen.retroDisplay.canvas.onmousedown = canvas.onmousedown;


    notes = _(_.range(OCTAVES))
            .map(function (o) { return _.map(NOTES, function (n) { return n + o;  }); })
            .flatten()
            .value();

    barWidth = CANVAS_WIDTH / (BAR_NUM * 2)
    barType  = BAR_TYPE_DEFAULT;

    bars = _.map(_.range(BAR_NUM), function (b) {
        return [Math.floor(notes.length / 2), barType, VOLUME_DEFAULT];
    });

    barUiHeight              = CANVAS_HEIGHT * (BAR_UI_PERCENTAGE / 100);
    barUiSpaceBetweenScreens = CANVAS_HEIGHT * ((100 - BAR_UI_PERCENTAGE - VOLUME_UI_PERCENTAGE) / 100);

    volumeUiHeight = CANVAS_HEIGHT * (VOLUME_UI_PERCENTAGE / 100);
    volumeStep     = volumeUiHeight / VOLUME_MAX_VAL;

    barNoteStep = BAR_MAX_VAL / notes.length;

    BandJS.loadPack('instrument', 'morewaves', AdditionalWavesInstrumentPack);

    sfxPlayer = new BandJS();
    sfxPlayer.setTimeSignature(4,4);

    draw();
}

function draw() {
    retroScreen.clear();

    // draw bars
    _.times(BAR_NUM, function (b) {
        var bar          = bars[b];
        var barHeight    = (barUiHeight * (bar[0] * barNoteStep)) / BAR_MAX_VAL;
        var volumeHeight = (volumeUiHeight * bar[2]) / VOLUME_MAX_VAL;

        // frequency bar
        retroScreen.fillRect((b * barWidth) + (barWidth * b), barUiHeight, barWidth, -barHeight, BAR_COLOR);
        // frequency bar color
        retroScreen.fillRect((b * barWidth) + (barWidth * b), barUiHeight - barHeight, barWidth, 3, BAR_TYPE_COLORS[bar[1]]);
        // volume
        retroScreen.fillRect((b * barWidth) + (barWidth * b), barUiHeight + barUiSpaceBetweenScreens + volumeUiHeight - volumeHeight, barWidth, -3, VOLUME_COLOR);
    });

    retroScreen.draw();
}

function makeSfx (bars) {
    sfxPlayer.instruments = [];
    sfxPlayer.setTempo(tempo);

    sfxPlayerWaves = _.map(BAR_TYPES, function (b) {
        var pack = 'oscillators';
        if (BAR_TYPES_PACKS[b]) pack = BAR_TYPES_PACKS[b];

        return sfxPlayer.createInstrument(b, pack);
    });

    _.each(bars, function (b) {
        _.each(sfxPlayerWaves, function (w, i) {
            if (w === sfxPlayerWaves[b[1]]) {
                sfxPlayerWaves[b[1]].setVolume(b[2]);
                sfxPlayerWaves[b[1]].note('thirtySecond', notes[b[0]]);
            } else {
                w.rest('thirtySecond');
            }
        });

    });

    return sfxPlayer.finish();
}

function exportSfx (bars) {
    return '00'
        + _.padLeft(parseInt($('#speed').val()).toString(16), 2, '0')
        + _.padLeft(parseInt($('#loop-start').val()).toString(16), 2, '0')
        + _.padLeft(parseInt($('#loop-end').val()).toString(16), 2, '0')
        + _.map(bars, function (b) {
            return _.padLeft(b[0].toString(16), 2, '0') + b[1].toString(16) + b[2].toString(16);
          }).join('');
}

function importSfx (str) {
    $('#speed').val(parseInt(str.substr(2, 2), 16));
    $('#loop-start').val(parseInt(str.substr(4, 2), 16));
    $('#loop-end').val(parseInt(str.substr(6, 2), 16));
    bars = _(str.substr(8))
           .chunk(4)
           .map(function (b) {
                b = b.join('');

                return [parseInt(b.substr(0, 2), 16), parseInt(b.substr(2, 1), 16), parseInt(b.substr(3, 1), 16)];
           })
           .value();
}


window.onload = init;
