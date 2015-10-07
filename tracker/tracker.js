(function () {
    var PAGES = {
        SAMPLE_EDITOR:  0,
        PATTERN_EDITOR: 1
    };

    var INSTRUMENTS_NUM = 16;

    var DEFAULT_INSTRUMENTS = [
        {
            osctype: RetroSound.OSC_TYPES.SINE
        }
    ];

    this.EditorTracker = function ($container, data) {
        var self = this;

        this.container             = $container;
        this.currentPage           = PAGES.SAMPLE_EDITOR;
        this.$pageSampler          = $container.find('.page.sampler');
        this.$waveformEditorCanvas = this.$pageSampler.find('canvas.waveform');
        this.waveformEditor        = new RetroScreen(this.$waveformEditorCanvas);
        this.waveformEditor.clear();

        // create soundchip
        this.soundchip = new RetroSound();
        this.soundchip.addInstruments(DEFAULT_INSTRUMENTS);

        this.selectedInstrument = 0;

        this.waveformEditor.onmousedown = function (e) {
        }

        this.waveformEditor.onmouseup = function (e) {
        }

        this.waveformEditor.onmouseout = function (e) {
        }

        this.waveformEditor.onmousemove = function (e) {

        }

        // audio functions
        this.playingSound = null;

        window.onkeyup = function (e) {
            if (e.keyCode == 32) self.toggleSound();
        };
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

                    switch (self.selectedInstrument.osctype) {
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
        toggleSound: function () {
            if (this.playingSound === null) {
                var osc = this.soundchip.playNote(this.selectedInstrument, 'C4', -1);
                this.playingSound = {
                    osc:        osc,
                    instrument: this.selectedInstrument
                };
            } else {
                this.soundchip.stopOscillator(this.playingSound.osc, this.playingSound.instrument);
                this.playingSound = null;
            }

            //     var buffer = this.sampleContext.createBuffer(1, this.samplesNum, 8000);
            //     // var buffer = this.sampleContext.createBuffer(1, this.samplesNum, SAMPLE_RATE);
            //     var normalizedSamples = _.map(this.waveformPoints, function (p) {
            //         return normalize(p, SAMPLE_MIN, SAMPLE_MAX, -1, 1);
            //     })
            //     buffer.copyToChannel(new Float32Array(this.waveformPoints), 0);

            //     this.playingSound = this.sampleContext.createBufferSource();
            //     this.playingSound.buffer = buffer;
            //     this.playingSound.connect(this.sampleContext.destination);
            //     this.playingSound.loop = true;
            //     this.playingSound.start();
            //     this.isPlaying = true;
            // } else {
            //     this.playingSound.stop();
            //     this.isPlaying = false;
            // }
        }
    }
})(this);