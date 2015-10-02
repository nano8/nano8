(function () {
    ///////////
    // SETUP //
    ///////////

    // CONSTANTS //

    // pico-8 constants
    var PICO_SCREEN_WIDTH  = 128;
    var PICO_SCREEN_HEIGHT = 128;

    var PICO_DEFAULT_COLORS_VALUES = [
        [0, 0, 0],
        [29, 43, 83],
        [126, 37, 83],
        [0, 135, 81],
        [171, 82, 54],
        [95, 87, 79],
        [194, 195, 199],
        [255, 241, 232],
        [255, 0, 77],
        [255, 163, 0],
        [255, 255, 39],
        [0, 231, 86],
        [41, 173, 255],
        [131, 118, 156],
        [255, 119, 168],
        [255, 204, 17]
    ];

    var PICO_INITIAL_COLOR      = 6; // grey
    var PICO_TRANSPARENT_COLORS = [0];

    var PICO_MAP_BYTES             = 2;
    var PICO_MAP_LOWER_BYTES_LINES = 64;

    // spico-8 constants
    var SPICO_SCREEN_WIDTH  = 160;
    var SPICO_SCREEN_HEIGHT = 144;

    var SPICO_MAP_BYTES = 3;

    // common constants
    var SCALE_FACTOR = 4;

    var SPRITE_WIDTH  = 8;
    var SPRITE_HEIGHT = 8;

    var SYSTEMFONT = {
        CHARSET:   'ABCDEFGHIJKLMNOPQRSTUVWXYZ"\'`-_/1234567890!?[](){}.,;:<>+=%#^*~ ',
        CHAR_W:    4,
        CHAR_H:    6,
        UPPERCASE: true,
        DATA:     'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAAGCAYAAAAsXEDPAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAZxJREFUeNrsV9kOg0AIVP//n601HjgdzuWliSRNRXc5BhbYed1oumnefg9+o0msub5/Pxyv0/uPvStbz3hcvwv9Phj6T/s0+9E+zR9vv2bfCG/JZ/ZKPI7HyeNRXzSelfiN8F58vHjjfsYjHhU8M3hn5Hv5ouWD/A76H7RMcpVE7TZiFyjfCQUXj9+Fkz/7mS7tv0LSvlO/5x/6o/nfYZ9ne0Y22h4hiQnDRotl1GbEy8I/wnv4ROJrYYZ4VPD0eEs+2nKShgWzXa6X+qQsRotncAcA3vpMwlpFpGqvp88DsVKcUL53QPGAWf6P2Mv2RniWxF35Mpo/FVkZHSMFCP9nQZoM9iwPPNpvFXF1AugCgAGaPbCVqpzpWAxgDEhXR2AV20uYzikiIp919MyEEJGfnTBGpqSM7IgPmQKpdXytwOMEwOJlnYXspLp4Dp4OYBJnOk7kG6tcmS5VnSCwcmq6rP2suEUTVOu4XQUPE8rDH/VHYjsyAVYnjq4DGLkyateFyBUzeyVlE0CmgbIrrVkAGxvrSy+99Gf0EWAAZy4AUlI12mIAAAAASUVORK5CYII='
    };

    var KEYBOARD = [
        [ // player 1
            [37],         // left     [left arrow]
            [39],         // right    [right arrow]
            [38],         // up       [up arrow]
            [40],         // down     [down arrow]
            [90, 67, 78], // button 1 [z, c, n]
            [88, 86, 77]  // button 2 [x, v, m]
        ],
        [ // player 2
            [83],         // left     [s]
            [70],         // right    [f]
            [69],         // up       [e]
            [68],         // down     [d]
            [81],     // button 1 [a] note: original pico-8 also defines left shift
            [65]        // button 2 [q] note: original pico-8 also defines tab
        ]
    ];

    var BUTTON_ACTIVE_DELAY = 12;
    var BUTTON_ACTIVE_SLEEP = 4;

    // SPICO VARIABLES

    // the screensize must be initialized early because it is used to instantiate the game
    var screenWidth;
    var screenHeight;
    if (SYSTEM === 'PICO-8') {
        screenWidth  = PICO_SCREEN_WIDTH;
        screenHeight = PICO_SCREEN_HEIGHT;
    }

    // will never change. this is the setting of the palette for the current game
    var palette;

    // originally set = to palette, it can be altered by pal() and palt()
    // the drawing functions refer to this
    var colors;

    // a dictionary that maps a string representing the color to the color index
    // for example '0,0,0': 0
    // it always refers to the _original_ colors and is not affected by calls to pal() or palt()
    var colorDecoding;

    // remaps a color to another. this is used in the display phase for colors remapped
    // by pal(c0, c1, p)
    // a dictionary like '0,0,0': [0, 0, 0]
    var colorRemappings;

    var transparentColors;

    var globalCounter;
    var currentColor;

    var screenBitmap;
    var screenBitmapData;
    var screenImage;

    var spritesheet;
    var spritesheetRowLength;
    var spritesheetSpritesPerRow;
    var spriteFlags;

    var mapSheet;
    var mapNumBytes;

    var cameraOffsetX;
    var cameraOffsetY;

    var clipping;

    var systemfont;
    var cursorX;
    var cursorY;

    var keysPressed;
    var keysPressedP;

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
    // generate the color remappings out the palette
    function generateColorRemappings () {
        colorRemappings = _.reduce(palette, function (acc, c, idx) {
            acc[c.join()] = _.cloneDeep(c);
            return acc;
        }, {});
    }

    function generateRetroFont () {
        var fontImg = new Image();
        fontImg.src = SYSTEMFONT.DATA;

        var fontCanvas = document.createElement('canvas');
        fontCanvas.width   = fontImg.width;
        fontCanvas.height  = fontImg.height;
        fontCanvas.getContext('2d').drawImage(fontImg, 0, 0, fontImg.width, fontImg.height);

        systemfont = {};

        _.each(SYSTEMFONT.CHARSET, function (c, i) {
            var letter = fontCanvas.getContext('2d').getImageData(i * SYSTEMFONT.CHAR_W, 0, SYSTEMFONT.CHAR_W, SYSTEMFONT.CHAR_H).data;
            systemfont[c] = _.map(_.range(SYSTEMFONT.CHAR_H), function () { return _.map(_.range(SYSTEMFONT.CHAR_W), function () { return 0; }) });

            for (var p = letter.length; p >= 0; p -= 4) {
                // skip if transparent
                if (letter[p + 3] > 0) {
                    var x = (p / 4) % SYSTEMFONT.CHAR_W;
                    var y = Math.floor((p / 4) / SYSTEMFONT.CHAR_W);

                    systemfont[c][y][x] = 1;
                }
            }
        });
    }

    function setKeysPressed (e, val) {
        // do it twice to handle both the player keys
        _.times(2, function (p) {
            var keyPressed = _.findIndex(KEYBOARD[p], function (k) { return _.contains(k, e.keyCode); });
            if (keyPressed !== -1) keysPressed[p][keyPressed] = val;
        });
    }

    function setKeysPressedP (e, val) {
        // do it twice to handle both the player keys
        _.times(2, function (p) {
            var keyPressed = _.findIndex(KEYBOARD[p], function (k) { return _.contains(k, e.keyCode); });
            if (keyPressed !== -1) {
                if (val === true) {
                    // if the key is already pressed, ignore it.
                    // set it to -1 so that when the first updateKeysPressedP() is called it sets it to 0
                    // and btnp() can recognize it as "just pressed key"
                    if (!keysPressedP[p][keyPressed][0]) keysPressedP[p][keyPressed] = [true, -1]
                } else {
                    keysPressedP[p][keyPressed] = [false, 0];
                }
            }
        });
    }

    function updateKeysPressedP () {
        _.times(2, function (p) {
            // increases the counter of each currently pressed key
            keysPressedP[p] = _.map(keysPressedP[p], function (k) {
                if (k[0]) k[1]++;
                return k;
            });
        });
    }

    // EXPOSED FUNCTIONS //

    // graphics
    window.clip = function (x, y, w, h) {
        if (arguments.length === 0) {
            clipping = null;
        } else {
            clipping = {
                x0: x,
                y0: y,
                x1: x + w,
                y1: y + h
            };
        }
    };
    window.pget = function (x, y) {
        try {
            return colorDecoding(screenBitmapData[flr(y)][flr(x)].join());
        } catch (err) {
           return 0;
        }
    };
    window.pset = function (x, y, c) {
        c = c !== undefined ? c : currentColor;

        // skip transparent colors
        if (_.contains(transparentColors, c)) return;

        // skip pixels outside the clipping region, if set
        if (clipping !== null && (x < clipping.x0 || x >= clipping.x1 || y < clipping.y0 || y >= clipping.y1)) return;

        try {
            screenBitmapData[flr(y) - cameraOffsetY][flr(x) - cameraOffsetX] = colors[c];
        } catch (err) {}
    };
    window.sget = function (x, y) {
        try {
            return spritesheet[y][x];
        } catch (err) { return 0; }
    };
    window.sset = function (x, y, c) {
        try {
            spritesheet[y][x] = c;
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
    window.print = function (str, x, y, c) {
        str = String(str !== undefined ? str : '');
        x   = x !== undefined ? x : cursorX;
        y   = y !== undefined ? y : cursorY;

        if (SYSTEMFONT.UPPERCASE) str = str.toUpperCase();

        _.each(str.split(''), function (character, i) {
            _.times(SYSTEMFONT.CHAR_H, function (yy) {
                _.times(SYSTEMFONT.CHAR_W, function (xx) {
                    try {
                        if (systemfont[character][yy][xx] === 1) pset(x + xx + (i * SYSTEMFONT.CHAR_W), y + yy, c);
                    } catch (err) {}
                });
            });
        });

        // advance the carriage
        cursorY += SYSTEMFONT.CHAR_H;
    };
    window.cursor = function (x, y) {
        cursorX = x;
        cursorY = y;
    };
    window.color = function (c) {
        currentColor = c;
    };
    window.cls = function (c) {
        screenBitmapData = _.map(_.range(screenHeight), function () { return _.map(_.range(screenWidth), function () { return palette[0]; }) });
        cursorX = 0;
        cursorY = 0;
    };
    window.camera = function (x, y) {
        x = x !== undefined ? x : 0;
        y = y !== undefined ? y : 0;

        cameraOffsetX = x;
        cameraOffsetY = y;
    };
    window.circ = function (x, y, r, c) {
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
        p = p !== undefined ? p : 0;

        // reset colors and colorRemappings if no argument is supplied
        if (arguments.length === 0) {
            colors = _.cloneDeep(palette);
            generateColorRemappings();
        } else {
            // alters the colors at draw time or display time
            if (p === 0) {
                colors[c0] = _.cloneDeep(palette[c1]);
            } else {
                colorRemappings[palette[c0].join()] = palette[c1];
            }
        }
    };
    window.palt = function (c, t) {
        // sets the given color to transparent or opaque or reset transparency
        if (c !== undefined && t !== undefined) {
            if (t === true)
                transparentColors = _.uniq(transparentColors.concat([c]));
            else
                transparentColors = _.remove(transparentColors, c);
        }
        else {
            transparentColors = [0];
        }
    };
    window.spr = function (n, x, y, w, h, flipX, flipY) {
        w = w !== undefined ? w : 1;
        h = h !== undefined ? h : 1;

        var spriteX = n;
        var spriteY = n;

        _.times(SPRITE_HEIGHT * h, function (yy) {
            _.times(SPRITE_WIDTH * w, function (xx) {
                var shiftX = flipX === true ? (SPRITE_WIDTH * w) - 1 - xx : xx;
                var shiftY = flipY === true ? (SPRITE_HEIGHT * h) - 1 - yy : yy;
                var row    = shiftY + (flr(n / spritesheetSpritesPerRow) * SPRITE_HEIGHT);
                var column = ((n * SPRITE_WIDTH) + shiftX) % spritesheetRowLength
                pset(x + xx, y + yy, spritesheet[row][column]);
            });
        });
    };
    window.sspr = function (sx, sy, sw, sh, dx, dy, dw, dh, flipX, flipY) {
        // reproduces pico behaviour
        if (dw !== undefined && dh === undefined) {
            dh = 0;
        } else {
            dw = dw !== undefined ? dw : sw;
            dh = dh !== undefined ? dh : sh;
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
                try {
                    pset(dx + x, dy + y, spritesheet[sy + scaledY][sx + scaledX]);
                } catch (err) {}
            });
        })
    };

    // input
    window.btn = function (i, p) {
        p = p !== undefined ? p : 0;

        if (i !== undefined) {
            return keysPressed[p][i];
        } else {
            var bitfield = _.map(keysPressed[p], function (k) { return k ? 1 : 0 }).join('');
            return parseInt(bitfield, 2)
        }
    };
    window.btnp = function (i, p) {
        p = p !== undefined ? p : 0;

        function checkBtnActive(b) {
            return b[0] && (b[1] === 0 || (b[1] >= BUTTON_ACTIVE_DELAY && b[1] % BUTTON_ACTIVE_SLEEP === 0))
        }

        if (i !== undefined) {
            return checkBtnActive(keysPressedP[p][i]);
        } else {
            var bitfield = _.map(keysPressedP[p], function (k) { return checkBtnActive(k) ? 1 : 0 }).join('');
            return parseInt(bitfield, 2)
        }
    };
    // map
    window.mget = function (x, y) {
        try {
            return mapSheet[y][x];
        } catch(err) { return 0; }
    };
    window.mset = function (x, y, v) {
        try {
            mapSheet[y][x] = v;
        } catch(err) {}
    };
    window.map = function (celX, celY, sx, sy, celW, celH, layer) {
        // try {
            _.times(celH, function (y) {
                _.times(celW, function (x) {
                    if (layer !== undefined && fget(mapSheet[celY + y][celX + x]) !== layer) return;

                    spr(mapSheet[celY + y][celX + x], (x * SPRITE_WIDTH) + sx, (y * SPRITE_HEIGHT) + sy);
                });
            });
        // } catch (err) {}
    };

    // math
    window.max = Math.max;
    window.min = Math.min;
    window.mid = function (x, y, z) { return x > y && x || y > z && z || y; };
    window.flr = Math.floor;
    window.sin = Math.sin;
    window.cos = Math.cos;
    window.sinp8 = function (x) { return Math.sin(-(x || 0) * (Math.PI * 2)); };
    window.cosp8 = function (x) { return Math.cos((x || 0) * (Math.PI * 2)); };
    window.atan2 = Math.atan2;
    window.atan2p8 = function (dx, dy) {
        // thanks to https://github.com/ftsf/picolove
        function picoAngle(a) { return (((a - Math.PI) / (Math.PI * 2)) + 0.25) % 1.0; }

        return picoAngle(Math.atan2(dy, dx));
    };
    window.sqrt = Math.sqrt;
    window.abs = Math.abs;
    window.rnd = function (x) {
        // NOTE: srand() not implemented since it doesn's make sense in javascript
        return Math.random() * (x || 1);
    };


    // bitwise operations
    window.band = function (x, y) { return x & y; };
    window.bor = function (x, y) { return x | y; };
    window.bxor = function (x, y) { return x ^ y; };
    window.bnot = function (x) { return !x; };
    window.shl = function (x, y) { return x << y; };
    window.shr = function (x, y) { return x >> y; };

    // GAME LOOP FUNCTIONS
    function preload () {

    }

    function init () {
        // setup variables according to the version (pico-8 or spico-8)
        if (SYSTEM === 'PICO-8') {
            palette           = PICO_DEFAULT_COLORS_VALUES;
            currentColor      = PICO_INITIAL_COLOR;
            transparentColors = PICO_TRANSPARENT_COLORS;
            mapNumBytes          = PICO_MAP_BYTES;
        } else if (SYSTEM === 'SPICO-8') {
            palette           = PALETTE;
            currentColor      = INITIAL_COLOR;
            transparentColors = TRANSPARENT_COLOR;
            mapNumBytes          = SPICO_MAP_BYTES;
        }

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

        // setup intial values
        colors        = _.cloneDeep(palette);
        globalCounter = 0;
        cameraOffsetX = 0;
        cameraOffsetY = 0;
        clipping      = null;
        systemfont    = {};
        cursorX       = 0;
        cursorY       = 0;
        keysPressed   = [
            _.map(KEYBOARD[0], function (k) { return false; }),
            _.map(KEYBOARD[1], function (k) { return false; })
        ];
        keysPressedP = [
            _.map(KEYBOARD[0], function (k) { return [false, 0]; }),
            _.map(KEYBOARD[1], function (k) { return [false, 0]; })
        ];

        // generate the system font
        generateRetroFont();

        // generate the bitmapData array
        cls();

        spritesheet = _.map(SPRITES, function (row) {
            return _.map(row, function (cell) {
                return parseInt(cell, 16);
            })
        });
        spritesheetRowLength     = spritesheet[0].length;
        spritesheetSpritesPerRow = spritesheetRowLength / SPRITE_WIDTH;

        mapSheet = _.map(MAP, function (row) {
            return _.map(_.chunk(row.split(''), mapNumBytes), function (cell) {
                return parseInt(cell.join(''), 16);
            });
        });
        // pico-8 has the lower bytes in common with the spritesheet
        // this will add the lower bytes of the spritesheet to the map sheet
        // pico-8, for some reason, saves the data in the data in those bytes, when edited
        // from the map editor, in *inverted* digits, so that for example 01 (1) is stored as 10
        // this is ignored here.
        // also, those bytes are not really shared here. modifying the spritesheet with sset does not
        // affet the map data. also, modifying the map with mset does not affet the sprite sheet
        if (SYSTEM === 'PICO-8') {
            mapSheet = mapSheet.concat(_(spritesheet)
                                       .takeRight(PICO_MAP_LOWER_BYTES_LINES)
                                       .chunk(2)
                                       .map(function (l) { return l[0].concat(l[1])})
                                       .map(function (l) { return _.map(_.chunk(l, 2), function (c) { return parseInt(c, 16); }) })
                                       .value());
        }

        colorDecoding = _.reduce(palette, function (acc, c, idx) {
            acc[c.join()] = idx;
            return acc;
        }, {});

        generateColorRemappings();

        spriteFlags = _.map(_.chunk(SPRITE_FLAGS.join('').split(''), 2), function (f) { return parseInt(f.join(''), 16) });

        // add keyboard event listeners
        window.addEventListener('keydown', function (e) {
            e.stopPropagation();
            setKeysPressed(e, true);
            setKeysPressedP(e, true);
        });
        window.addEventListener('keyup', function (e) {
            e.stopPropagation();
            setKeysPressed(e, false);
            setKeysPressedP(e, false);
        });

        // call the game _init() function if exists
        if (window._init) window._init();
    }

    function update () {
        globalCounter++;

        // each frame the print cursor is updated
        cursorY = 0;
        cursorX = 0;

        // force 30 FPS-like mode (like pico8)
        // call the game _update() function if exists
        if (globalCounter % 2 === 0) {
            updateKeysPressedP();
            if (window._update) window._update();
        }
    }

    function render () {
        // call the game _draw() function if exists
        if (window._draw) window._draw();

        screenBitmap.processPixelRGB(function (p, x, y) {
            var color         = screenBitmapData[y][x];
            var remappedColor = colorRemappings[color.join()];

            p.r = remappedColor[0];
            p.g = remappedColor[1];
            p.b = remappedColor[2];
            p.a = 255;
            return p;
        });

        // show the retro display
        retroDisplay.context.drawImage(game.canvas, 0, 0, game.width, game.height, 0, 0, retroDisplay.width, retroDisplay.height);
    }
})(this);