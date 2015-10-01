var fs = require('fs');

var PICO_FILE_ARG_POS  = 2;
var SPICO_FILE_ARG_POS = 3;
var GFX_STR_OPEN    = '// __gfx__\nvar SPRITES = ';
var GFF_STR_OPEN    = '// __gff__\nvar SPRITE_FLAGS = ';
var MAP_STR_OPEN    = '// __map__\nvar MAP = ';
var STR_CLOSE   = ';\n\n';

var picoFile     = fs.readFileSync(process.argv[PICO_FILE_ARG_POS], 'utf-8');
var spicoFile    = fs.readFileSync(process.argv[SPICO_FILE_ARG_POS], 'utf-8');

var picoGfx     = picoFile.match(/__gfx__([\s\S])*(?=__gff__)/gm)[0].replace('__gfx__', '').trim();
var picoGfxRows = picoGfx.split('\n');

var picoGff     = picoFile.match(/__gff__([\s\S])*(?=__map__)/gm)[0].replace('__gff__', '').trim();
var picoGffRows = picoGff.split('\n');

var picoMap     = picoFile.match(/__map__([\s\S])*(?=__sfx__)/gm)[0].replace('__gff__', '').trim();
var picoMapRows = picoMap.split('\n');

var spicoNewFile = spicoFile.replace(/\/\/ __gfx__([\s\S])*(?=\/\/ __gff__)/gm, GFX_STR_OPEN + JSON.stringify(picoGfxRows, null, 4) + STR_CLOSE)
                            .replace(/\/\/ __gff__([\s\S])*(?=\/\/ __map__)/gm, GFF_STR_OPEN + JSON.stringify(picoGffRows, null, 4) + STR_CLOSE)
                            .replace(/\/\/ __map__([\s\S])*(?=\/\/ __gpl__)/gm, MAP_STR_OPEN + JSON.stringify(picoMapRows, null, 4) + STR_CLOSE);

console.log(spicoNewFile);

fs.writeFileSync(process.argv[SPICO_FILE_ARG_POS], spicoNewFile, 'utf-8');