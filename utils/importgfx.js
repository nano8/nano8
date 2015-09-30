var fs = require('fs');

var PICO_FILE_ARG_POS  = 2;
var SPICO_FILE_ARG_POS = 3;
var SPRITE_STR_OPEN    = '// __gfx__\nvar SPRITES = ';
var SPRITE_STR_CLOSE   = ';\n';

var picoFile  = fs.readFileSync(process.argv[PICO_FILE_ARG_POS], 'utf-8');
var spicoFile = fs.readFileSync(process.argv[SPICO_FILE_ARG_POS], 'utf-8');

var picoGfx     = picoFile.match(/__gfx__([\s\S])*(?=__gff__)/gm)[0].replace('__gfx__', '').trim();
var picoGfxRows = picoGfx.split('\n');

var spicoNewFile = spicoFile.replace(/\/\/ __gfx__([\s\S])*/gm, SPRITE_STR_OPEN + JSON.stringify(picoGfxRows, null, 4) + SPRITE_STR_CLOSE);

fs.writeFileSync(process.argv[SPICO_FILE_ARG_POS], spicoNewFile, 'utf-8');