
////////////////
// SFX EDITOR //
////////////////

var CANVAS_WIDTH  = 450;
var CANVAS_HEIGHT = 300;

var CANVAS_BG_COLOR = '#000000';

var BAR_COLOR       = '#A6A7AD';
var BAR_NUM         = 32;
var BAR_MAX_VAL     = 100;
var BAR_TYPE_COLORS = [ '#FB002B', '#FD8208', '#FFFF0B', '#21EB2E', '#1B83FF', '#5C4B79', '#FC3D85'];

var bars;
var barWidth;
var barType;
var canvas;
var ctx;

var retroScreen;

var drawing = false;

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

window.onload = init;
