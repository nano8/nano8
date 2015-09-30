(function () {
    ///////////
    // SETUP //
    ///////////

    // CONSTANTS //
    var PICO_SCREEN_WIDTH  = 128;
    var PICO_SCREEN_HEIGHT = 128;

    var SPICO_SCREEN_WIDTH  = 256;
    var SPICO_SCREEN_HEIGHT = 224;

    var SCALE_FACTOR = 4;

    var DEFAULT_COLORS = [];

    var DEFAULT_COLORS_VALUES = [
        [0, 0, 0, 0],
        [29, 43, 83, 255],
        [126, 37, 83, 255],
        [0, 135, 81, 255],
        [171, 82, 54, 255],
        [95, 87, 79, 255],
        [194, 195, 199, 255],
        [255, 241, 232, 255],
        [255, 0, 77, 255],
        [255, 163, 0, 255],
        [255, 255, 39, 255],
        [0, 231, 86, 255],
        [41, 173, 255, 255],
        [131, 118, 156, 255],
        [255, 119, 168, 255],
        [255, 204, 17, 255]
    ];

    var SPRITE_WIDTH  = 8;
    var SPRITE_HEIGHT = 8;

    // SPICO VARIABLES

    var screenWidth  = PICO_SCREEN_WIDTH;
    var screenHeight = PICO_SCREEN_HEIGHT;

    var colors      = DEFAULT_COLORS;
    var colorValues = DEFAULT_COLORS_VALUES;

    var globalCounter = 0;
    var currentColor = 0;

    var screenBitmapData;
    var screenImage;

    var spritesheet;

    // setup the game
    var game  = new Phaser.Game(screenWidth, screenHeight,
                                Phaser.CANVAS,
                                '',
                                {
                                     init: init,
                                     preload: preload,
                                     update: update,
                                     render: render
                                 },
                                 false, false);
    var retroDisplay = { scale: SCALE_FACTOR, canvas: null, context: null, width: 0, height: 0 };

    // INNER FUNCTIONS
    function generateDefaultColor () {
        DEFAULT_COLORS = DEFAULT_COLORS_VALUES.map(function (c) { return 'rga(' + c.join(', ') + ')';  });
    }

    // EXPOSED FUNCTIONS //

    // graphics
    window.clip = function (x, y, w, h) {};
    window.pget = function (x, y) {
        var color = screenBitmapData.getPixel(x, y);
        return _.findIndex(colorValues, function (c) {
            return c[0] === color.r && c[1] === color.g && c[2] === color.b;
        });
    };
    window.pset = function (x, y, c) {
        var red   = colorValues[c || currentColor][0];
        var green = colorValues[c || currentColor][1];
        var blue  = colorValues[c || currentColor][2];

        screenBitmapData.setPixel(x, y, red, green, blue);
    };
    window.fget = function (n, f) {};
    window.fset = function (x, f, v) {};
    window.print = function (str, x, y, c) {};
    window.cursor = function (x, y) {};
    window.color = function (c) {
        currentColor = c;
    };
    window.cls = function (c) {
        screenBitmapData.clear();
        screenBitmapData.update();
    };
    window.camera = function (x, y) {};
    window.circ = function (x, y, r, c) {
        var red   = colorValues[c || currentColor][0];
        var green = colorValues[c || currentColor][1];
        var blue  = colorValues[c || currentColor][2];

        // bresenham midpoint circle algorithm to draw a pixel-perfect line
        var xx = r;
        var yy = 0;
        var radiusError = 1 - xx;

        var imageData = screenBitmapData.imageData;
        var data = imageData.data;
        var index;

        while (xx >= yy) {
            screenBitmapData.setPixel(xx + x, yy + y, red, green, blue);
            screenBitmapData.setPixel(yy + x, xx + y, red, green, blue);
            screenBitmapData.setPixel(-xx + x, yy + y, red, green, blue);
            screenBitmapData.setPixel(-yy + x, xx + y, red, green, blue);
            screenBitmapData.setPixel(-xx + x, -yy + y, red, green, blue);
            screenBitmapData.setPixel(-yy + x, -xx + y, red, green, blue);
            screenBitmapData.setPixel(xx + x, -yy + y, red, green, blue);
            screenBitmapData.setPixel(yy + x, -xx + y, red, green, blue);

            yy++;

            if (radiusError < 0) {
                radiusError += 2 * yy + 1;
            }
            else {
                xx--;
                radiusError+= 2 * (yy - xx + 1);
            }
        }
    };
    window.circfill = function (x, y, r, c) {
        var red   = colorValues[c || currentColor][0];
        var green = colorValues[c || currentColor][1];
        var blue  = colorValues[c || currentColor][2];

        // bresenham midpoint circle algorithm to draw a pixel-perfect line
        var xx = r;
        var yy = 0;
        var radiusError = 1 - xx;

        var imageData = screenBitmapData.imageData;
        var data = imageData.data;
        var index;

        while (xx >= yy) {
            window.line(xx + x, yy + y, -xx + x, yy + y, c);
            window.line(yy + x, xx + y, -yy + x, xx + y, c);
            window.line(-xx + x, -yy + y, xx + x, -yy + y, c);
            window.line(-yy + x, -xx + y, yy + x, -xx + y, c);

            yy++;

            if (radiusError < 0) {
                radiusError += 2 * yy + 1;
            }
            else {
                xx--;
                radiusError+= 2 * (yy - xx + 1);
            }
        }
    };
    window.line = function (x0, y0, x1, y1, c) {
        var red   = colorValues[c || currentColor][0];
        var green = colorValues[c || currentColor][1];
        var blue  = colorValues[c || currentColor][2];

        // bresenham midpoint circle algorithm to draw a pixel-perfect line
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = (x0 < x1) ? 1 : -1;
        var sy = (y0 < y1) ? 1 : -1;
        var err = dx - dy;

        while(true) {
            screenBitmapData.setPixel(x0, y0, red, green, blue);

            if ((x0 === x1) && (y0 === y1)) break;

            var e2 = 2 * err;
            if (e2 >- dy) { err -= dy; x0  += sx; }
            if (e2 <  dx) { err += dx; y0  += sy; }
        }
    };
    window.rect = function (x0, y0, x1, y1, c) {
        window.line(x0, y0, x1, y0, c);
        window.line(x1, y0, x1, y1, c);
        window.line(x1, y1, x0, y1, c);
        window.line(x0, y1, x0, y0, c);
    };
    window.rectfill = function (x0, y0, x1, x2, c) {
        screenBitmapData.rect(x0, y0, x1, x2, colors[c || currentColor]);
    };
    window.pal = function (c0, c1, p) {};
    window.palt = function (c, t) {
        if (c !== undefined && t !== undefined) {
            DEFAULT_COLORS_VALUES = DEFAULT_COLORS_VALUES[c][3] = t ? 0 : 255;
        }
        else {
            DEFAULT_COLORS_VALUES = DEFAULT_COLORS_VALUES.map(function (c) { return _.dropRight().concat([255]); });
            DEFAULT_COLORS_VALUES[0][3] = 0;
        }
        generateDefaultColor();
    };
    window.spr = function (n, x, y, w, h, flipX, flipY) {};
    window.sspr = function (sx, sy, sw, sh, dx, dy, dw, dh, flipX, flipY) {};

    // input
    window.btn = function (i, p) {};
    window.btnp = function (i, p) {};

    // map
    window.mget = function (x, y) {};
    window.mset = function (x, y, v) {};
    window.map = function (celX, celY, sx, sy, celW, celH, layer) {};

    // math
    window.max = Math.max;
    window.min = Math.min;
    window.mid = function (x, y, z) { /* return x > y and x or y > z and z or y */ };
    window.flr = Math.floor;
    window.sin = Math.sin;
    window.cos = Math.cos;
    window.sinp8 = function (x) { return Math.sin(Math.PI*x); }
    window.cosp8 = function (x) { return Math.cos(Math.PI*x); }
    window.atan2 = function (dx, dy) {
        // function __pico_angle(a)
        //     -- FIXME: why does this work?
        //     return (((a - math.pi) / (math.pi*2)) + 0.25) % 1.0
        // end

        // atan2 = function(y,x) return __pico_angle(math.atan2(y,x)) end
    };
    window.sqrt = Math.sqrt;
    window.abs = Math.abs;
    window.rnd = function (x) { return Math.random() * (x || 1); };
    // NOTE: srand() not implemented since it doesn's make sense in javascript

    // bitwise operations
    window.band = function (x, y) { return x & y; };
    window.bor = function (x, y) { return x | y; };
    window.bxor = function (x, y) { return x ^ y; };
    window.bnot = function (x) { return !x; };
    window.shl = function (x, y) { return x << y; };
    window.shr = function (x, y) { return x >> y; };

    // GAME FUNCTIONS
    function preload () {

    }

    function init () {
        // setup the retro display
        game.canvas.style['display'] = 'none';
        retroDisplay.canvas = Phaser.Canvas.create(this, game.width * retroDisplay.scale, game.height * retroDisplay.scale);
        retroDisplay.context = retroDisplay.canvas.getContext('2d');
        Phaser.Canvas.addToDOM(retroDisplay.canvas);
        Phaser.Canvas.setSmoothingEnabled(retroDisplay.context, false);
        Phaser.Canvas.setSmoothingEnabled(game.context, false);
        retroDisplay.width = retroDisplay.canvas.width;
        retroDisplay.height = retroDisplay.canvas.height;

        // initialize the main display object
        screenBitmapData = game.make.bitmapData(screenWidth, screenHeight);
        screenImage      = game.add.image(0, 0, screenBitmapData);

        // generate the utiliy array DEFAULT_COLORS from DEFAULT_COLORS_VALUES
        generateDefaultColor();

        // load the spritesheet
        var numSprites = (SPRITES[0].length / SPRITE_WIDTH) * (SPRITES.length / SPRITE_HEIGHT);
        spritesheet = game.make.bitmapData(numSprites * SPRITE_WIDTH, SPRITE_HEIGHT);

        _.times(numSprites, function (n) {
            _.times(SPRITE_WIDTH, function (x) {
                _.times(SPRITE_HEIGHT, function (y) {
                    var colorHex = SPRITES[((n * SPRITE_WIDTH) % SPRITES[0].length) + x][((n * SPRITE_HEIGHT) % SPRITES.length) + y];
                    var color    = colorValues[parseInt(colorHex, 16)];
                    spritesheet.setPixel((n * SPRITE_WIDTH) + x, y, color[0], color[1], color[2]);
                });
            });
        });

        game.add.image(0, 0, spritesheet);

        // call the game _init() function if exists
        if (window._init) window._init();
    }

    function update () {
        globalCounter++;

        // force 30 FPS-like mode (like pico8)
        // call the game _update() function if exists
        if (globalCounter % 2 === 0) {
            if (window._update) window._update();
        }
    }

    function render () {
        // call the game _draw() function if exists
        // if (window._draw) window._draw();

        // show the retro display
        retroDisplay.context.drawImage(game.canvas, 0, 0, game.width, game.height, 0, 0, retroDisplay.width, retroDisplay.height);
    }
})(this);