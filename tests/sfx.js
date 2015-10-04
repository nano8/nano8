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

////////////////
// SFX EDITOR //
////////////////

var CANVAS_WIDTH  = 450;
var CANVAS_HEIGHT = 300;

var CANVAS_BG_COLOR = '#000000';

var BAR_COLOR       = '#A6A7AD';
var BAR_NUM         = 32;
var BAR_MAX_VAL     = 4000;
var BAR_TYPE_COLORS = ['#FB002B', '#FD8208', '#FFFF0B', '#21EB2E', '#1B83FF', '#5C4B79', '#FC3D85', '#FDB385'];
var BAR_TYPES       = ['sine', 'square', 'sawtooth', 'triangle', 'white', 'pulse', 'bezier', 'bezier2'];
var BAR_TYPES_PACKS = {
    'white':  'noises',
    'pulse':  'morewaves',
    'bezier': 'morewaves',
    'bezier2': 'morewaves'
}

var OCTAVES = 8;
var NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

var bars;
var barWidth;
var barType;

var canvas;
var ctx;
var retroScreen;

var notes;
var barNoteStep;

var drawing = false;

var sfxPlayer;
var sfxPlayerWaves;

var tempo = 200;

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

    canvas.onmousedown = function (e) {
        drawing = true;

        canvas.onmousemove(e);
    };

    canvas.onmouseup = function (e) {
        drawing = false;
    }

    canvas.onmouseout = onmouseup;

    canvas.onmousemove = function(e){
        if(!drawing) return;

        var bar     = Math.floor(e.layerX / barWidth) / 2;
        var isOnBar = bar === Math.floor(bar);

        bars[bar] =  [((BAR_MAX_VAL * (CANVAS_HEIGHT - e.layerY)) / CANVAS_HEIGHT), barType]

        drawBars();
    }

    retroScreen = new RetroScreen(canvas);

    barWidth = CANVAS_WIDTH / (BAR_NUM * 2)
    barType  = 0;

    bars = _.map(_.range(BAR_NUM), function (b) {
        return [BAR_MAX_VAL / 2, barType];
    });

    notes = _(_.range(OCTAVES))
            .map(function (o) { return _.map(NOTES, function (n) { return n + o;  }); })
            .flatten()
            .value();
    barNoteStep = BAR_MAX_VAL / notes.length;

    BandJS.loadPack('instrument', 'morewaves', AdditionalWavesInstrumentPack);

    sfxPlayer = new BandJS();
    sfxPlayer.setTimeSignature(4,4);

    drawBars();
}

function drawBars() {
    retroScreen.clear();

    // draw bars
    _.times(BAR_NUM, function (b) {
        var bar       = bars[b];
        var barHeight = (CANVAS_HEIGHT * bar[0]) / BAR_MAX_VAL;

        retroScreen.fillRect((b * barWidth) + (barWidth * b), CANVAS_HEIGHT, barWidth, -barHeight, hexToRgb(BAR_COLOR));
        retroScreen.fillRect((b * barWidth) + (barWidth * b), CANVAS_HEIGHT - barHeight, barWidth, 5, hexToRgb(BAR_TYPE_COLORS[bar[1]]));
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
        var note = Math.floor(b[0] / barNoteStep);

        _.each(sfxPlayerWaves, function (w, i) {
            if (w === sfxPlayerWaves[b[1]]) sfxPlayerWaves[b[1]].note('thirtySecond', notes[note]);
            else w.rest('thirtySecond');
        });

    });

    return sfxPlayer.finish();
}

window.onload = init;
