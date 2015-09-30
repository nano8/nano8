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

    var colorValues         = DEFAULT_COLORS_VALUES;
    var originalColorValues = DEFAULT_COLORS_VALUES;
    var displayColorValues  = DEFAULT_COLORS_VALUES;

    var globalCounter = 0;
    var currentColor = 0;

    var screenBitmap;
    var screenBitmapData;
    var screenImage;

    var spritesheet;
    var spritesheetRowLength;
    var spritesheetSpritesPerRow;
    var spriteFlags;

    var cameraOffsetX = 0;
    var cameraOffsetY = 0;

    // setup the game
    var game  = new Phaser.Game(screenWidth, screenHeight,
                                Phaser.CANVAS,
                                '',
                                {
                                     init:    init,
                                     preload: preload,
                                     update:  update,
                                     render:  render
                                 },
                                 false, false);
    var retroDisplay = { scale: SCALE_FACTOR, canvas: null, context: null, width: 0, height: 0 };

    // INNER FUNCTIONS

    // EXPOSED FUNCTIONS //

    // graphics
    window.clip = function (x, y, w, h) {};
    window.pget = function (x, y) {
        try {
            return screenBitmapData[flr(y)][flr(x)];
        } catch (err) {
           return 0;
        }
    };
    window.pset = function (x, y, c) {
        try {
            screenBitmapData[flr(y) - cameraOffsetY][flr(x) - cameraOffsetX] = c || currentColor;
        } catch (err) {}
    };
    window.fget = function (n, f) {
        var flag = spriteFlags[n] || 0;

        // return the number or the nth bit of it as boolean
        return f !== undefined ? ((flag & ( 1 << f )) >> f) === 1 : flag
    };
    window.fset = function (n, f, v) {
        // sets the number of the flag or a specific bit
        if (arguments.length === 2) {
            spriteFlags[n] = f;
        } else if (arguments.length === 3) {
            var flagBinary = (spriteFlags[n] >>> 0).toString(2).split('');

            flagBinary[f]  = v === true ? '1' : '0';
            spriteFlags[n] = parseInt(flagBinary.join(''), 2);
        }
    };
    window.print = function (str, x, y, c) {};
    window.cursor = function (x, y) {};
    window.color = function (c) {
        currentColor = c;
    };
    window.cls = function (c) {
        screenBitmapData = _.map(_.range(screenHeight), function () { return _.map(_.range(screenWidth), function () { return 0; }) });
    };
    window.camera = function (x, y) {
        x = x || 0;
        y = y || 0;

        cameraOffsetX = x;
        cameraOffsetY = y;
    };
    window.circ = function (x, y, r, c) {
        c = c || currentColor;

        // bresenham midpoint circle algorithm to draw a pixel-perfect line
        var xx = r;
        var yy = 0;
        var radiusError = 1 - xx;

        while (xx >= yy) {
            pset( xx + x,  yy + y, c);
            pset( yy + x,  xx + y, c);
            pset(-xx + x,  yy + y, c);
            pset(-yy + x,  xx + y, c);
            pset(-xx + x, -yy + y, c);
            pset(-yy + x, -xx + y, c);
            pset( xx + x, -yy + y, c);
            pset( yy + x, -xx + y, c);

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
        c = c || currentColor;

        // bresenham midpoint circle algorithm to draw a pixel-perfect line
        var xx = r;
        var yy = 0;
        var radiusError = 1 - xx;

        var imageData = screenBitmap.imageData;
        var data = imageData.data;
        var index;

        while (xx >= yy) {
            line( xx + x,  yy + y, -xx + x,  yy + y, c);
            line( yy + x,  xx + y, -yy + x,  xx + y, c);
            line(-xx + x, -yy + y,  xx + x, -yy + y, c);
            line(-yy + x, -xx + y,  yy + x, -xx + y, c);

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
        c = c || currentColor;

        // bresenham midpoint circle algorithm to draw a pixel-perfect line
        var dx = Math.abs(x1 - x0);
        var dy = Math.abs(y1 - y0);
        var sx = (x0 < x1) ? 1 : -1;
        var sy = (y0 < y1) ? 1 : -1;
        var err = dx - dy;

        while(true) {
            pset(x0, y0, c);

            if ((x0 === x1) && (y0 === y1)) break;

            var e2 = 2 * err;
            if (e2 >- dy) { err -= dy; x0  += sx; }
            if (e2 <  dx) { err += dx; y0  += sy; }
        }
    };
    window.rect = function (x0, y0, x1, y1, c) {
        line(x0, y0, x1, y0, c);
        line(x1, y0, x1, y1, c);
        line(x1, y1, x0, y1, c);
        line(x0, y1, x0, y0, c);
    };
    window.rectfill = function (x0, y0, x1, y1, c) {
        _.each(_.range(y0, y1-y0 + 1), function (y) {
            _.each(_.range(x0, x1-x0 + 1), function (x) {
                pset(x, y, c);
            });
        });
    };
    window.pal = function (c0, c1, p) {
        p = p || 0;

        debugger;
        if (arguments.length === 0) {
            colorValues        = _.cloneDeep(originalColorValues);
            displayColorValues = _.cloneDeep(originalColorValues);
        } else {
            if (p === 0) {
                colorValues[c0] = _.cloneDeep(originalColorValues[c1]);
            } else {
                displayColorValues[c0] = _.cloneDeep(originalColorValues[c1]);
            }
        }
    };
    window.palt = function (c, t) {
        if (c !== undefined && t !== undefined) {
            colorValues[c][3] = t ? 0 : 255;
        }
        else {
            colorValues = colorValues.map(function (c) { return _.dropRight().concat([255]); });
            colorValues[0][3] = 0;
        }
    };
    window.spr = function (n, x, y, w, h, flipX, flipY) {
        w = w || 1;
        h = h || 1;

        var spriteX = (n * SPRITE_WIDTH) % spritesheetRowLength;
        var spriteY = flr(n / spritesheetSpritesPerRow) * SPRITE_HEIGHT;
        var spriteW = spriteX + (SPRITE_WIDTH * w);
        var spriteH = spriteY + (SPRITE_HEIGHT * h);

        sspr(spriteX,
             spriteY,
             spriteW, spriteH,
             x, y,
             spriteW, spriteH,
             flipX, flipY);
    };
    window.sspr = function (sx, sy, sw, sh, dx, dy, dw, dh, flipX, flipY) {
        // reproduces pico behaviour
        if (dw !== undefined && dh === undefined) {
            dh = 0;
        } else {
            dw = dw || sw;
            dh = dh || sh;
        }

        var ratioX = sw / dw;
        var ratioY = sh / dh;

        // use the nearest neighbour algorythm to scale the image
        _.each(_.range(dh), function (y) {
            _.each(_.range(dw), function (x) {
                var xx = flipX === true ?  dw - 1 - x : x;
                var yy = flipY === true ?  dh - 1 - y : y;
                var scaledX = flr(xx * ratioX);
                var scaledY = flr(yy * ratioY);

                pset(dx + x, dy + y, spritesheet[sy + scaledY][sx + scaledX]);
            });
        })
    };

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
        screenBitmap = game.make.bitmapData(screenWidth, screenHeight);
        screenImage  = game.add.image(0, 0, screenBitmap);

        // generate the bitmapData array
        cls();

        // TODO spritesheet as ints
        spritesheet = _.map(SPRITES, function (row) {
            return _.map(row, function (cell) {
                return parseInt(cell, 16);
            })
        });
        spritesheetRowLength     = spritesheet[0].length;
        spritesheetSpritesPerRow = spritesheetRowLength / SPRITE_WIDTH;

        spriteFlags = _.map(_.chunk(SPRITE_FLAGS.join('').split(''), 2), function (f) { return parseInt(f.join(''), 16) });

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
        if (window._draw) window._draw();

        screenBitmap.processPixelRGB(function (p, x, y) {
            var color = displayColorValues[screenBitmapData[y][x]];

            if (color === undefined) debugger;

            p.r = color[0];
            p.g = color[1];
            p.b = color[2];
            p.a = color[3];
            return p;
        });

        // show the retro display
        retroDisplay.context.drawImage(game.canvas, 0, 0, game.width, game.height, 0, 0, retroDisplay.width, retroDisplay.height);
    }
})(this);