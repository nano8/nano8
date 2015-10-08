(function () {
    var PAGES = {
        SAMPLE_EDITOR:  0,
        PATTERN_EDITOR: 1
    };

    var INSTRUMENTS_NUM = 16;

    var DEFAULT_INSTRUMENTS = [];

    var CANVAS_MODES = {
        DEFAULT: 0,
        VOLUME:  1
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

    this.EditorTracker = function ($container, data) {
        var self = this;

        this.container             = $container;
        this.currentPage           = PAGES.SAMPLE_EDITOR;
        this.$pageSampler          = $container.find('.page.sampler');
        this.$waveformEditorCanvas = this.$pageSampler.find('canvas.waveform');
        this.waveformEditor        = new RetroScreen(this.$waveformEditorCanvas);
        this.waveformEditor.clear();

        // interface
        this.editorsInitialization = {
            wave:   false,
            volume: false
        };
        this.isDrawing = false;

        // audio functions
        this.playingSound       = false;
        this.selectedInstrument = 0;
        this.testNoteLength     = (1000 / (TEST_NOTE_BPM / 60)) * TEST_NOTE_LENGTHS.eight;

        // create the soundchip
        this.soundchip = new RetroSound();
        DEFAULT_INSTRUMENTS = [this.soundchip.generateDefaultInstrument()];
        this.soundchip.addInstruments(DEFAULT_INSTRUMENTS);

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

        drawWaveform: function (mode) {
            mode = mode === undefined ? CANVAS_MODES.DEFAULT : mode;

            var self = this;
            var lastX, lastY;
            var stepX, stepY;

            this.waveformEditor.clear();

            this.waveformEditor.line(0, this.waveformEditor.height / 2, this.waveformEditor.width, this.waveformEditor.height / 2, Spico.PICO_DEFAULT_COLORS_VALUES[6]);

            _.times(this.waveformEditor.width, function (x) {
                var y;

                lastY = lastY === undefined ? self.waveformEditor.height / 2 : lastY;
                lastX = lastX === undefined ? 0 : lastX;

                switch (self.soundchip.instruments[self.selectedInstrument].oscillatorType) {
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
                        y = Math.random() * self.waveformEditor.height;
                        break;

                }

                self.waveformEditor.line(lastX, lastY, x, y, Spico.PICO_DEFAULT_COLORS_VALUES[5]);

                lastX = x;
                lastY = y;
            });

            switch (mode) {
                case CANVAS_MODES.VOLUME:
                    stepX = this.waveformEditor.width / RetroSound.VOLUME_STEPS;

                    // this.soundchip.instruments[this.selectedInstrument].volume = _.map(_.range(32), function () { return Math.random(); });

                    _.each(this.soundchip.instruments[this.selectedInstrument].volume, function (y, x, volumes) {
                        self.waveformEditor.line(x * stepX,
                            y * self.waveformEditor.height,
                            (x * stepX) + stepX,
                            y * self.waveformEditor.height,
                            Spico.PICO_DEFAULT_COLORS_VALUES[8]);

                        if (x === 0) return;

                        self.waveformEditor.line(x * stepX,
                            y * self.waveformEditor.height,
                            x * stepX,
                            volumes[x-1] * self.waveformEditor.height,
                            Spico.PICO_DEFAULT_COLORS_VALUES[8]);

                    });
                    break;
            }

            this.waveformEditor.draw();
        },

        resetCanvasEvents: function () {
            this.waveformEditor.onmousedown = function (e) {};

            this.waveformEditor.onmouseup = function (e) {};

            this.waveformEditor.onmouseout = function (e) {};

            this.waveformEditor.onmousemove = function (e) {};
        },

        activateWaveEditor: function () {
            var self = this;

            if (!this.editorsInitialization.wave) {
                this.container.find('.wave-type').on('click', function () {
                    self.soundchip.instruments[self.selectedInstrument].oscillatorType = $(this).attr('data-wave');
                    self.container.find('.wave-type').removeClass('selected');
                    $(this).addClass('selected');
                    self.drawWaveform();
                });

                this.container.find('.fine-tuning input[type=range]').on('input', function () {
                    var newFinetuning = parseFloat($(this).val());

                    self.container.find('.fine-tuning span.value').text((newFinetuning > 0 ? '+' : '') + newFinetuning);
                    self.soundchip.instruments[self.selectedInstrument].finetuning = newFinetuning;
                });

                this.container.find('.tuning input[type=range]').on('input', function () {
                    var newTuning = parseInt($(this).val());

                    self.container.find('.tuning span.value').text((newTuning > 0 ? '+' : '') +newTuning);
                    self.soundchip.instruments[self.selectedInstrument].tuning = newTuning;
                });

                self.editorsInitialization.wave = true;
            }

            this.container.find('.wave-types .wave-type[data-wave="' + this.soundchip.instruments[this.selectedInstrument].oscillatorType + '"]');
            this.container.find('.tuning input[type="range"]').val(this.soundchip.instruments[this.selectedInstrument].tuning);
            this.container.find('.fine-tuning input[type="range"]').val(this.soundchip.instruments[this.selectedInstrument].finetuning);

            this.drawWaveform();
        },

        activateVolumeEditor: function () {
            var self = this;

            function setValue (e) {

                var x = Math.floor(e.retroLayerX / (self.waveformEditor.width / RetroSound.VOLUME_STEPS));
                var y = Math.floor(e.retroLayerY / (self.waveformEditor.height / RetroSound.VOLUME_DEPTH));
                var y = e.retroLayerY / self.waveformEditor.height;

                self.soundchip.instruments[self.selectedInstrument].volume[x] = y;

                self.drawWaveform(CANVAS_MODES.VOLUME);
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

            this.drawWaveform(CANVAS_MODES.VOLUME);
        },

        playSound: function () {
            var self = this;

            if (this.playingSound) return;

            this.soundchip.playNote(this.selectedInstrument, TEST_NOTE, this.testNoteLength, function () {
                self.playingSound = false;
            });
            this.playingSound = true;
        }
    }
})(this);