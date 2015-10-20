(function () {
    var PAGES = {
        SAMPLE_EDITOR:  0,
        PATTERN_EDITOR: 1
    };

    var INSTRUMENTS_NUM = 16;

    var DEFAULT_INSTRUMENTS = [];

    var CANVAS_MODES = {
        DEFAULT:  0,
        VOLUME:   1,
        PITCH:    2,
        TREMOLO:  3,
        VIBRATO:  4,
        ARPEGGIO: 5,
        FILTER:   6,
        REVERB:   7
    };

    var TEST_NOTE          = 'C4';
    var TEST_NOTE_POSITION = _.findIndex(RetroSound.ORDERED_NOTES, function (n) { return n[0] === TEST_NOTE; });
    var TEST_NOTE_BPM      = 120;
    var TEST_NOTE_LENGTHS  = {
        eight:   0.5,
        quarter: 1,
        half:    2,
        whole:   4,
    };

    var VOLUME_DEFAULTS = [
        [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        [0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.50, 0.54, 0.575, 0.60, 0.64],
        [0.03125, 0.043, 0.056, 0.087, 0.1, 0.13, 0.18, 0.23, 0.3, 0.37, 0.42, 0.46, 0.5, 0.55, 0.58, 0.65],
        [0, 0.17, 0.28, 0.37, 0.43, 0.49, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5],
        [0.5, 0.74, 0.86, 0.73, 0.57, 0.47, 0.35, 0.27, 0.2, 0.16, 0.11, 0.087, 0.071, 0.04, 0.01, 0]
    ];

    var PICO_COLORS = {
        DARK_GREY:  5,
        LIGHT_GREY: 6,
        RED:        8
    };

    var DEFAULT_FONT_WIDTH = 4;

    this.EditorTracker = function ($container, data) {
        var self = this;

        this.container             = $container;
        this.currentPage           = PAGES.SAMPLE_EDITOR;
        this.$pageSampler          = $container.find('.page.sampler');
        this.$waveformEditorCanvas = this.$pageSampler.find('canvas.waveform');
        this.waveformEditor        = new RetroScreen(this.$waveformEditorCanvas, Nano.PICO_DEFAULT_COLORS_VALUES);
        this.waveformEditor.clear();

        // interface
        this.editorsInitialization = {
            wave:     false,
            volume:   false,
            pitch:    false,
            tremolo:  false,
            vibrato:  false,
            arpeggio: false,
            filter:   false,
            effects:  false
        };
        this.isDrawing = false;

        // audio functions
        this.playingSound       = false;
        this.testNoteLength     = (1000 / (TEST_NOTE_BPM / 60)) * TEST_NOTE_LENGTHS.quarter;

        // noise wave representation
        this.noiseWaveDrawing = _.map(_.range(this.waveformEditor.width), function () { return Math.random() * self.waveformEditor.height; });

        // create the soundchip
        this.soundchip = new RetroSound();
        DEFAULT_INSTRUMENTS = [this.soundchip.generateDefaultInstrument()];
        this.soundchip.addInstruments(DEFAULT_INSTRUMENTS);

        this.selectedInstrumentId = 0;
        this.selectedInstrument   = this.soundchip.instruments[this.selectedInstrumentId];

        this.resetCanvasEvents();

        // interface events - tab switch
        this.container.find('.tabs-switch .switch').on('click', function () {
            self.container.find('.tabs-switch .switch').removeClass('selected');
            $(this).addClass('selected');

            self.container.find('.panels .panel').removeClass('selected');
            self.container.find('.panels .panel[data-panel="' + $(this).data('panel') + '"]').addClass('selected');

            self.resetCanvasEvents();

            switch($(this).data('panel')) {
                case 'wave':
                    self.activateWaveEditor();
                    break;
                case 'volume':
                    self.activateVolumeEditor();
                    break;
                case 'pitch':
                    self.activatePitchEditor();
                    break;
                case 'tremolo':
                    self.activateTremoloEditor();
                    break;
                case 'vibrato':
                    self.activateVibratoEditor();
                    break;
                case 'arpeggio':
                    self.activateArpeggioEditor();
                    break;
                case 'filter':
                    self.activateFilterEditor();
                    break;
                case 'effects':
                    self.activateEffectsEditor();
                    break;
            }
        });

        this.container.find('.tabs-switch .switch.selected').trigger('click');

        // interface events - change test note length
        this.container.find('.note-lengths .note-length').on('click', function () {
            self.container.find('.note-lengths .note-length').removeClass('selected');
            $(this).addClass('selected');

            self.testNoteLength = (1000 / (TEST_NOTE_BPM / 60)) * TEST_NOTE_LENGTHS[$(this).data('length')];
        });

        // interface keyboard events
        window.onkeyup = function (e) {
            if (e.keyCode == 32) self.playSound();
        };
    };

    this.EditorTracker.prototype = {
        getPages: function () {},
        collectData: function () {},
        dispose: function () {},

        drawWaveform: function (mode, extraDrawFn) {
            mode = mode === undefined ? CANVAS_MODES.DEFAULT : mode;

            var self = this;
            var lastX, lastY;
            var stepX, stepY;

            this.waveformEditor.clear();

            this.waveformEditor.line(0, this.waveformEditor.height / 2, this.waveformEditor.width, this.waveformEditor.height / 2, PICO_COLORS.LIGHT_GREY);

            _.times(this.waveformEditor.width, function (x) {
                var y;

                lastY = lastY === undefined ? self.waveformEditor.height / 2 : lastY;
                lastX = lastX === undefined ? 0 : lastX;

                switch (self.selectedInstrument.oscillatorType) {
                    case RetroSound.OSC_TYPES.SINE:
                        y = (Math.sin(x / 9.62) * self.waveformEditor.height / 2) + self.waveformEditor.height / 2;
                        break;
                    case RetroSound.OSC_TYPES.SQUARE:
                        y = ((x % 30) < 30/2 ? (30/2) / (30/2) : 0) * 40 + 20;
                        break;
                    case RetroSound.OSC_TYPES.SAWTOOTH:
                        y = (x % 1.02 - 0.4) * 55 + 35;
                        break;
                    case RetroSound.OSC_TYPES.TRIANGLE:
                        y = Math.abs(((x / 3) % 24) - 12) * 2 + 28;
                        break;
                    case RetroSound.OSC_TYPES.NOISE:
                        y = self.noiseWaveDrawing[x];
                        break;
                }

                self.waveformEditor.line(lastX, lastY, x, y, PICO_COLORS.DARK_GREY);

                lastX = x;
                lastY = y;
            });


            function drawBars(steps, source) {
                stepX = self.waveformEditor.width / steps;

                _.each(source, function (y, x, data) {
                    self.waveformEditor.line(x * stepX,
                        (1 - y) * self.waveformEditor.height,
                        (x * stepX) + stepX,
                        (1 - y) * self.waveformEditor.height,
                        PICO_COLORS.RED);

                    if (x === 0) return;

                    self.waveformEditor.line(x * stepX,
                        (1 - y) * self.waveformEditor.height,
                        x * stepX,
                        (1 - data[x-1]) * self.waveformEditor.height,
                        PICO_COLORS.RED);

                });
            }

            function drawModulationSine(depth, frequency, max) {
                lastX = undefined;
                lastY = undefined;

                _.times(self.waveformEditor.width, function (x) {
                    var y;

                    lastY = lastY === undefined ? self.waveformEditor.height / 2 : lastY;
                    lastX = lastX === undefined ? 0 : lastX;

                    y = (Math.sin(x / Math.max(max - frequency, 1))) * ((self.waveformEditor.height / 2) * depth) + (self.waveformEditor.height / 2);

                    self.waveformEditor.line(lastX, lastY, x, y, PICO_COLORS.RED);

                    lastX = x;
                    lastY = y;
                });
            }

            switch (mode) {
                case CANVAS_MODES.VOLUME:
                    drawBars(RetroSound.MODULATIONS_STEPS, this.selectedInstrument.volume);
                    break;
                case CANVAS_MODES.PITCH:
                    drawBars(RetroSound.MODULATIONS_STEPS, this.selectedInstrument.pitch);
                    break;
                case CANVAS_MODES.TREMOLO:
                    if (self.selectedInstrument.tremolo.active) {
                        drawModulationSine(self.selectedInstrument.tremolo.depth, self.selectedInstrument.tremolo.frequency, RetroSound.TREMOLO_MAX_FREQUENCY);
                    }
                    break;
                case CANVAS_MODES.VIBRATO:
                    if (self.selectedInstrument.vibrato.active) {
                        drawModulationSine(self.selectedInstrument.vibrato.depth, self.selectedInstrument.vibrato.frequency, RetroSound.VIBRATO_MAX_FREQUENCY);
                    }
                    break;
                case CANVAS_MODES.ARPEGGIO:
                    if (self.selectedInstrument.arpeggio.active) {
                        var stepX = self.waveformEditor.width / self.selectedInstrument.arpeggio.notes.length;
                        var stepY = self.waveformEditor.height / RetroSound.MODULATION_DEPTH;

                        _.each(self.selectedInstrument.arpeggio.notes, function (n, i) {
                            var x0 = i * stepX;
                            var x1 = (i * stepX) + stepX;
                            var y  = ((n * -1) + (RetroSound.MODULATION_DEPTH / 2)) * stepY;

                            self.waveformEditor.line(x0, y, x1, y, PICO_COLORS.RED);
                            self.waveformEditor.line(x0, y + 1, x1, y + 1, PICO_COLORS.RED);
                        });
                    }
                    break;
                case CANVAS_MODES.FILTER:
                    drawBars(RetroSound.MODULATIONS_STEPS, this.selectedInstrument.filter.frequencies);
                    break;
            }

            if (extraDrawFn !== undefined) {
                extraDrawFn(self.waveformEditor);
            }

            this.waveformEditor.draw();
        },

        resetCanvasEvents: function () {
            this.waveformEditor.onmousedown = function (e) {};

            this.waveformEditor.onmouseup = function (e) {};

            this.waveformEditor.onmouseout = function (e) {};

            this.waveformEditor.onmousemove = function (e) {};
        },

        activateToggleButton: function ($el, obj, param, canvasDrawType) {
            var self = this;

            $el.on('click', function () {
                if (obj[param]) {
                    $(this).removeClass('selected');
                } else {
                    $(this).addClass('selected');
                }
                obj[param] = !obj[param];

                if (canvasDrawType !== undefined) self.drawWaveform(canvasDrawType);
            });
        },

        activateBarEditor: function (target, canvasDrawType, steps, depth) {
            var self = this;

            function setValue (e) {
                var x = Math.floor(e.retroLayerX / (self.waveformEditor.width / steps));
                var y = Math.floor(e.retroLayerY / (self.waveformEditor.height / depth));
                var y = 1 - (e.retroLayerY / self.waveformEditor.height);

                target[x] = y;

                self.drawWaveform(canvasDrawType);
            }

            this.waveformEditor.onmousedown = function (e) {
                self.isDrawing = true;
                setValue(e);
            };

            this.waveformEditor.onmouseup = function (e) {
                self.isDrawing = false;
            };

            this.waveformEditor.onmouseout = function (e) {
                self.isDrawing = false;
            };

            this.waveformEditor.onmousemove = function (e) {
                if (!self.isDrawing) return;

                setValue(e);
            };
        },

        activateWaveEditor: function () {
            var self = this;

            if (!this.editorsInitialization.wave) {
                this.container.find('.wave-type').on('click', function () {
                    self.selectedInstrument.oscillatorType = $(this).attr('data-wave');
                    self.container.find('.wave-type').removeClass('selected');
                    $(this).addClass('selected');
                    self.drawWaveform();
                });

                this.container.find('.fine-tuning input[type=range]').on('input', function () {
                    var newFinetuning = parseFloat($(this).val());

                    self.container.find('.fine-tuning span.value').text((newFinetuning > 0 ? '+' : '') + newFinetuning);
                    self.selectedInstrument.finetuning = newFinetuning;
                });

                this.container.find('.tuning input[type=range]').on('input', function () {
                    var newTuning = parseInt($(this).val());

                    self.container.find('.tuning span.value').text((newTuning > 0 ? '+' : '') +newTuning);
                    self.selectedInstrument.tuning = newTuning;
                });

                self.editorsInitialization.wave = true;
            }

            this.container.find('.wave-types .wave-type[data-wave="' + this.selectedInstrument.oscillatorType + '"]');
            this.container.find('.tuning input[type="range"]').val(this.selectedInstrument.tuning);
            this.container.find('.fine-tuning input[type="range"]').val(this.selectedInstrument.finetuning);

            this.drawWaveform();
        },

        activateVolumeEditor: function () {
            var self = this;

            if (!this.editorsInitialization.volume) {
                this.container.find('.volume-default')
                    .on('mousedown', function () {
                        $(this).addClass('selected');
                    })
                    .on('mouseup', function () {
                        $(this).removeClass('selected');
                        self.selectedInstrument.volume = VOLUME_DEFAULTS[parseInt($(this).data('default'))];
                        self.drawWaveform(CANVAS_MODES.VOLUME);
                    })
                    .on('mouseout', function () {
                        $(this).removeClass('selected');
                    });
            }

            this.activateBarEditor(this.selectedInstrument.volume, CANVAS_MODES.VOLUME, RetroSound.MODULATIONS_STEPS, RetroSound.MODULATION_DEPTH);

            this.drawWaveform(CANVAS_MODES.VOLUME);
        },

        activatePitchEditor: function () {
            var self = this;

            if (!this.editorsInitialization.pitch) {
                this.activateToggleButton(this.container.find('.glide'), self.selectedInstrument, 'glide');
            }

            if (self.selectedInstrument.glide) {
                this.container.find('.glide').addClass('selected');
            } else {
                this.container.find('.glide').removeClass('selected');
            }

            this.activateBarEditor(this.selectedInstrument.pitch, CANVAS_MODES.PITCH, RetroSound.MODULATIONS_STEPS, RetroSound.MODULATION_DEPTH);

            this.drawWaveform(CANVAS_MODES.PITCH);
        },

        activateFreqDepthEditor: function ($container, param, canvasDrawType) {
            var self = this;

            this.activateToggleButton($container.find('.active'), self.selectedInstrument[param], 'active', canvasDrawType);

            $container.find('.frequency input[type=range]').on('input', function () {
                var newFrequency = parseFloat($(this).val());

                $container.find('.frequency span.value').text(newFrequency);
                self.selectedInstrument[param].frequency = newFrequency;

                self.drawWaveform(canvasDrawType);
            });
            $container.find('.depth input[type=range]').on('input', function () {
                var newDepth = parseFloat($(this).val());

                $container.find('.depth span.value').text(newDepth);
                self.selectedInstrument[param].depth = newDepth * (1 / RetroSound.MODULATION_DEPTH);

                self.drawWaveform(canvasDrawType);
            });

        },

        activateTremoloEditor: function () {
            var self = this;

            if (!this.editorsInitialization.tremolo)  {
                this.activateFreqDepthEditor(this.container.find('.panel[data-panel="tremolo"]'), 'tremolo', CANVAS_MODES.TREMOLO);

                this.editorsInitialization.tremolo = true;
            }

            if (self.selectedInstrument.tremolo.active) {
                this.container.find('.panel[data-panel="tremolo"] .active').addClass('selected');
            } else {
                this.container.find('.panel[data-panel="tremolo"] .active').removeClass('selected');
            }

            this.container.find('.panel[data-panel="tremolo"] .frequency input[type=range]').val(this.selectedInstrument.tremolo.frequency).trigger('input');
            this.container.find('.panel[data-panel="tremolo"] .depth input[type=range]').val(this.selectedInstrument.tremolo.depth * RetroSound.MODULATION_DEPTH).trigger('input');

            this.drawWaveform(CANVAS_MODES.TREMOLO);
        },

        activateVibratoEditor: function () {
            var self = this;

            if (!this.editorsInitialization.vibrato)  {
                this.activateFreqDepthEditor(this.container.find('.panel[data-panel="vibrato"]'), 'vibrato', CANVAS_MODES.VIBRATO);

                this.editorsInitialization.vibrato = true;
            }

            if (self.selectedInstrument.vibrato.active) {
                this.container.find('.panel[data-panel="vibrato"] .active').addClass('selected');
            } else {
                this.container.find('.panel[data-panel="vibrato"] .active').removeClass('selected');
            }

            this.container.find('.panel[data-panel="vibrato"] .frequency input[type=range]').val(this.selectedInstrument.vibrato.frequency).trigger('input');
            this.container.find('.panel[data-panel="vibrato"] .depth input[type=range]').val(this.selectedInstrument.vibrato.depth * RetroSound.MODULATION_DEPTH).trigger('input');

            this.drawWaveform(CANVAS_MODES.VIBRATO);
        },

        activateArpeggioEditor: function () {
            var self = this;

            if (!this.editorsInitialization.arpeggio)  {
                // activate controls
                this.activateToggleButton(this.container.find('.panel[data-panel="arpeggio"] .active'), self.selectedInstrument.arpeggio, 'active', CANVAS_MODES.ARPEGGIO);

                this.container.find('.panel[data-panel="arpeggio"] .notes input[type=range]').on('input', function () {
                    var newNotes = parseInt($(this).val());

                    self.container.find('.panel[data-panel="arpeggio"] .notes span.value').text(newNotes);

                    if (newNotes < self.selectedInstrument.arpeggio.notes.length) {
                        self.selectedInstrument.arpeggio.notes = _.take(self.selectedInstrument.arpeggio.notes, newNotes);
                    } else {
                        self.selectedInstrument.arpeggio.notes = self.selectedInstrument.arpeggio.notes.concat(_.times(newNotes - self.selectedInstrument.arpeggio.notes.length, function () {
                            return 0;
                        }));
                    }

                    self.drawWaveform(CANVAS_MODES.ARPEGGIO);
                });

                this.container.find('.panel[data-panel="arpeggio"] .speed input[type=range]').on('input', function () {
                    var newSpeed = parseInt($(this).val());

                    self.container.find('.panel[data-panel="arpeggio"] .speed span.value').text(newSpeed);
                    self.selectedInstrument.arpeggio.speed = newSpeed;
                });

                this.editorsInitialization.arpeggio = true;

                self.drawWaveform(CANVAS_MODES.ARPEGGIO);
            }

            // activate canvas events
            function setNote(e) {
                var stepLength = (self.waveformEditor.width / self.selectedInstrument.arpeggio.notes.length)
                var stepNumber = Math.floor(e.retroLayerX / stepLength);
                var note       = Math.floor((e.retroLayerY / (self.waveformEditor.height / RetroSound.MODULATION_DEPTH)) - (RetroSound.MODULATION_DEPTH / 2)) * -1;

                self.selectedInstrument.arpeggio.notes[stepNumber] = note;

                self.drawWaveform(CANVAS_MODES.ARPEGGIO, function (canvas) {
                    var numberToDraw = (note > 0 ? '+ ' : '') + note;

                    canvas.print(numberToDraw,
                        ((stepNumber * stepLength) + stepLength / 2) - ((DEFAULT_FONT_WIDTH * numberToDraw.length) / 2),
                        e.retroLayerY + (e.retroLayerY - 7 < 0 ? 5 : -7));
                });
            }

            this.waveformEditor.onmousedown = function (e) {
                self.isDrawing = true;
                setNote(e);
            };

            this.waveformEditor.onmouseup = function (e) {
                self.isDrawing = false;
                self.drawWaveform(CANVAS_MODES.ARPEGGIO);
            };

            this.waveformEditor.onmouseout = function (e) {
                self.isDrawing = false;
                self.drawWaveform(CANVAS_MODES.ARPEGGIO);
            };

            this.waveformEditor.onmousemove = function (e) {
                if (!self.isDrawing) return;

                setNote(e);
            };

            // initialize values
            if (self.selectedInstrument.arpeggio.active) {
                this.container.find('.panel[data-panel="arpeggio"] .active').addClass('selected');
            } else {
                this.container.find('.panel[data-panel="arpeggio"] .active').removeClass('selected');
            }

            this.container.find('.panel[data-panel="arpeggio"] .notes input[type=range]').val(this.selectedInstrument.arpeggio.notes.length).trigger('input');
            this.container.find('.panel[data-panel="arpeggio"] .speed input[type=range]').val(this.selectedInstrument.arpeggio.speed).trigger('input');

            this.drawWaveform(CANVAS_MODES.ARPEGGIO);
        },

        activateFilterEditor: function () {
            var self = this;

            if (!this.editorsInitialization.filter)  {
                this.activateBarEditor(this.selectedInstrument.filter.frequencies, CANVAS_MODES.FILTER, RetroSound.MODULATIONS_STEPS, RetroSound.MODULATION_DEPTH);

                this.activateToggleButton(this.container.find('.panel[data-panel="filter"] .active'), self.selectedInstrument.filter, 'active', CANVAS_MODES.FILTER);

                this.container.find('.panel[data-panel="filter"] .frequency input[type=range]').on('input', function () {
                    var newFrequency = parseInt($(this).val());

                    self.container.find('.panel[data-panel="filter"] .frequency span.value').text(newFrequency);
                    self.selectedInstrument.filter.baseFrequency = newFrequency;
                });

                this.container.find('.panel[data-panel="filter"] .q input[type=range]').on('input', function () {
                    var newQ = parseInt($(this).val());

                    self.container.find('.panel[data-panel="filter"] .q span.value').text(newQ);
                    self.selectedInstrument.filter.q = newQ;
                });

                this.container.find('.panel[data-panel="filter"] .depth input[type=range]').on('input', function () {
                    var newDepth = parseInt($(this).val());

                    self.container.find('.panel[data-panel="filter"] .depth span.value').text(newDepth);
                    self.selectedInstrument.filter.q = newDepth;
                });

                this.editorsInitialization.filter = true;
            }

            // initialize values
            if (self.selectedInstrument.filter.active) {
                this.container.find('.panel[data-panel="filter"] .active').addClass('selected');
            } else {
                this.container.find('.panel[data-panel="filter"] .active').removeClass('selected');
            }

            this.container.find('.panel[data-panel="filter"] .frequency input[type=range]').val(this.selectedInstrument.filter.frequency).trigger('input');
            this.container.find('.panel[data-panel="filter"] .q input[type=range]').val(this.selectedInstrument.filter.q).trigger('input');
            this.container.find('.panel[data-panel="filter"] .depth input[type=range]').val(this.selectedInstrument.filter.depth).trigger('input');

            this.drawWaveform(CANVAS_MODES.FILTER);
        },

        activateEffectsEditor: function () {
            var self = this;

            if (!this.editorsInitialization.effects)  {
                this.activateToggleButton(this.container.find('.panel[data-panel="effects"] .reverb'), self.selectedInstrument.effects, 'reverb', CANVAS_MODES.REVERB);

                this.editorsInitialization.effects = true;
            }

            // initialize values
            if (self.selectedInstrument.effects.reverb) {
                this.container.find('.panel[data-panel="effects"] .reverb').addClass('selected');
            } else {
                this.container.find('.panel[data-panel="effects"] .reverb').removeClass('selected');
            }

            this.drawWaveform(CANVAS_MODES.REVERB);
        },

        playSound: function () {
            var self = this;

            // if (this.playingSound) return;

            // this.soundchip.playNote({
            //     instrumentId: this.selectedInstrumentId,
            //     note:         TEST_NOTE,
            //     time:         125,
            //     // time:         this.testNoteLength,
            //     bpm:          TEST_NOTE_BPM,
            //     doneCallback: function () {
            //         self.playingSound = false;
            //     }
            // });

            var pattern = [
                ['C4', 0, 0.125, 0, 0, 0, 0],
                ['D4', 0, 0.25, 0, 0, 0, 0],
                ['E4', 0, 0.25, 0, 0, 0, 0],
                ['F4', 0, 0.5, 0, 0, 0, 0],
                ['F5', 0, 0.5, 0, 0, 0, 0],
                ['E5', 0, 0.75, 0, 0, 0, 0],
                ['D5', 0, 1, 0, 0, 0, 0],
                ['C#5', 0, 0.25, 0, 0, 0, 0],
                ['C4', 0, 3.25, 0, 1, 0, 0],
            ];

            this.soundchip.playPattern(pattern, 120);

            this.playingSound = true;
        }
    }
})(this);