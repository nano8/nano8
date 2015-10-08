(function () {
    var PAGES = {
        SAMPLE_EDITOR:  0,
        PATTERN_EDITOR: 1
    };

    var INSTRUMENTS_NUM = 16;

    var DEFAULT_INSTRUMENTS = [
        {
            oscillatorType: RetroSound.OSC_TYPES.SINE,
            tuning:         0,
            finetuning:     0,
        }
    ];

    var TEST_NOTE          = 'C4';
    var TEST_NOTE_POSITION = _.findIndex(RetroSound.ORDERED_NOTES, function (n) { return n[0] === TEST_NOTE; });
    var TEST_NOTE_BPM      = 120;

    var wholeNote     = 4;
    var halfNote      = 2;
    var quarterNote   = 1;
    var eightNote     = 0.5;
    var sixteenthNote = 0.25;

    var TEST_NOTE_DURATION = (1000 / (TEST_NOTE_BPM / 60)) * wholeNote;

    this.EditorTracker = function ($container, data) {
        var self = this;

        this.container             = $container;
        this.currentPage           = PAGES.SAMPLE_EDITOR;
        this.$pageSampler          = $container.find('.page.sampler');
        this.$waveformEditorCanvas = this.$pageSampler.find('canvas.waveform');
        this.waveformEditor        = new RetroScreen(this.$waveformEditorCanvas);
        this.waveformEditor.clear();

        // interface
        // this.selectedTab = 'wave';

        // audio functions
        this.playingSound = false;
        this.selectedInstrument = 0;

        // create the soundchip
        this.soundchip = new RetroSound();
        this.soundchip.addInstruments(DEFAULT_INSTRUMENTS);

        // interface events canvas
        this.waveformEditor.onmousedown = function (e) {
        }

        this.waveformEditor.onmouseup = function (e) {
        }

        this.waveformEditor.onmouseout = function (e) {
        }

        this.waveformEditor.onmousemove = function (e) {
        }

        // interface events - tab switch
        $container.find('.tabs-switch .switch').on('click', function () {
            $container.find('.tabs-switch .switch').removeClass('selected');
            $(this).addClass('selected');

            $container.find('.panels .panel').removeClass('selected');
            $container.find('.panels .panel[data-panel="' + $(this).data('panel') + '"]').addClass('selected');
        });

        // interface events - wave tab
        $container.find('.wave-type').on('click', function () {
            self.soundchip.instruments[self.selectedInstrument].oscillatorType = $(this).attr('data-wave');
            $container.find('.wave-type').removeClass('selected');
            $(this).addClass('selected');
            self.drawWaveform();
        });

        $container.find('.fine-tuning input[type=range]').on('input', function () {
            var newFinetuning = parseFloat($(this).val());

            $container.find('.fine-tuning span.value').text((newFinetuning > 0 ? '+' : '') + newFinetuning);
            self.soundchip.instruments[self.selectedInstrument].finetuning = newFinetuning;
        });

        $container.find('.tuning input[type=range]').on('input', function () {
            var newTuning = parseInt($(this).val());

            $container.find('.tuning span.value').text((newTuning > 0 ? '+' : '') +newTuning);
            self.soundchip.instruments[self.selectedInstrument].tuning = newTuning;
        });

        // interface keyboard events
        window.onkeyup = function (e) {
            if (e.keyCode == 32) self.playSound();
        };

        // done, draw the waveform
        this.drawWaveform();
    };

    this.EditorTracker.prototype = {
        getPages: function () {},
        collectData: function () {},
        dispose: function () {},

        drawWaveform: function () {
            var self = this;
            var lastX, lastY;

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

            this.waveformEditor.draw();
        },
        playSound: function () {
            var self = this;

            if (this.playingSound) return;

            this.soundchip.playNote(this.selectedInstrument, TEST_NOTE, TEST_NOTE_DURATION, function () {
                self.playingSound = false;
            });
            this.playingSound = true;
        }
    }
})(this);