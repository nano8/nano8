var SPRITES = [[]];

var width = 64;
var height = 64;
var steps_per_update = 120;
var whole_base_per_step = false;


var size = width * height;
var current_base = 1;
var next_i = 2;
var min_color = 2;
var max_color = 15;
var next_color = min_color;
var states = [];
var xs = [];
var ys = [];

_.times(height, function (y) {
    _.times(width, function (x) {
         var i = y * width + x + 1;
         states[i] = false;
         xs[i] = width - 1 - x;
         ys[i] = height - 1 - y;
    })
});


function step() {
    if (current_base > size) return

    states[next_i] = !states[next_i];

    if (states[next_i] && next_i >= 1 && next_i <= size) {
        var color = pget(xs[next_i], ys[next_i]);
        if (color < min_color) color = min_color - 1;
        color+=1;

        if (color > max_color) color = min_color;
        var x = xs[next_i];
        var y = ys[next_i];
        var x2 = 2 * width - 1 - x;
        var y2 = 2 * height - 1 - y;
        pset(x, y, color);
        pset(x, y2, color);
        pset(x2, y, color);
        pset(x2, y2, color);
    }

    next_i += current_base;

    if (next_i > size) {
        current_base += 1;
        next_color += 1;
        if (next_color > max_color) next_color = min_color;
        if (current_base > size) current_base = 2;

        next_i = current_base
    }
}

function _init() {
    cls();
}

function _update() {
    _.times(steps_per_update, function (i) {
        if (whole_base_per_step) {
            var base = current_base;
            while (current_base == base && current_base <= size) {
                step();
            }
        } else {
            step()    ;
        }

    });
}

function _draw() {}
