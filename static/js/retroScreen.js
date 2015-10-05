//////////////
// RETROPXL //
//////////////

(function () {
    function RetroScreen (canvas) {
        var self = this;

        this.canvas = canvas;
        this.ctx    = canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height, '#ffffff');
        this.canvas.style['display'] = 'none';

        // setup retrodisplay
        this.retroDisplay                              = { scale: 4, canvas: null, context: null, width: 0, height: 0 };
        this.retroDisplay.width                        = this.canvas.width * this.retroDisplay.scale;
        this.retroDisplay.height                       = this.canvas.height * this.retroDisplay.scale;
        this.retroDisplay.canvas                       = document.createElement('canvas');
        this.retroDisplay.canvas.width                 = this.canvas.width  * this.retroDisplay.scale;
        this.retroDisplay.canvas.height                = this.canvas.height * this.retroDisplay.scale;
        this.retroDisplay.context                      = this.retroDisplay.canvas.getContext('2d');
        this.retroDisplay.context.imageSmoothingEnabled = false;

        this.canvas.parentNode.insertBefore(this.retroDisplay.canvas, this.canvas.nextSibling);

        this.data   = _.map(_.range(this.canvas.height), function () {
            return _.map(_.range(self.canvas.width), function () {
                return [0, 0, 0];
            });
        });
        this.imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    }

    RetroScreen.prototype =  {
        clear: function () {
            this.data = _.map(_.range(this.canvas.height), function () {
                return _.map(_.range(this.canvas.width), function () {
                    return [0, 0, 0];
                });
            });
        },
        setPixel: function (x, y, c) {
            try {
                this.data[Math.round(y)][Math.round(x)] = c;
            } catch (err) {}
        },
        line: function (x0, y0, x1, y1, c) {
            // bresenham midpoint circle algorithm to draw a pixel-perfect line

            var dx = Math.abs(x1 - x0);
            var dy = Math.abs(y1 - y0);
            var sx = (x0 < x1) ? 1 : -1;
            var sy = (y0 < y1) ? 1 : -1;
            var err = dx - dy;

            while(true) {
                this.setPixel(x0, y0, c);

                if ((x0 === x1) && (y0 === y1)) break;

                var e2 = 2 * err;
                if (e2 >- dy) { err -= dy; x0  += sx; }
                if (e2 <  dx) { err += dx; y0  += sy; }
            }
        },
        rect: function (x, y, w, h, c) {
            // normalize input
            var x0 = Math.min(x, x + w);
            var x1 = Math.max(x, x + w);
            var y0 = Math.min(y, y + h);
            var y1 = Math.max(y, y + h);

            this.line(x0, y0, x1, y0, c);
            this.line(x1, y0, x1, y1, c);
            this.line(x1, y1, x0, y1, c);
            this.line(x0, y1, x0, y0, c);
        },
        fillRect: function (x, y, w, h, c) {
            var self = this;

            // normalize input
            var x0 = Math.min(x, x + w);
            var x1 = Math.max(x, x + w);
            var y0 = Math.min(y, y + h);
            var y1 = Math.max(y, y + h);

            _.each(_.range(y0, y1), function (yy) {
                _.each(_.range(x0, x1), function (xx) {
                    self.setPixel(xx, yy, c);
                });
            });
        },
        circ: function (x, y, r, c) {
            var xx = r;
            var yy = 0;
            var radiusError = 1 - xx;

            while (xx >= yy) {
                this.setPixel( xx + x,  yy + y, c);
                this.setPixel( yy + x,  xx + y, c);
                this.setPixel(-xx + x,  yy + y, c);
                this.setPixel(-yy + x,  xx + y, c);
                this.setPixel(-xx + x, -yy + y, c);
                this.setPixel(-yy + x, -xx + y, c);
                this.setPixel( xx + x, -yy + y, c);
                this.setPixel( yy + x, -xx + y, c);

                yy++;

                if (radiusError < 0) {
                    radiusError += 2 * yy + 1;
                }
                else {
                    xx--;
                    radiusError+= 2 * (yy - xx + 1);
                }
            }
        },
        circFill: function (x, y, r, c) {
            // bresenham midpoint circle algorithm to draw a pixel-perfect line
            var xx = r;
            var yy = 0;
            var radiusError = 1 - xx;

            while (xx >= yy) {
                this.line( xx + x,  yy + y, -xx + x,  yy + y, c);
                this.line( yy + x,  xx + y, -yy + x,  xx + y, c);
                this.line(-xx + x, -yy + y,  xx + x, -yy + y, c);
                this.line(-yy + x, -xx + y,  yy + x, -xx + y, c);

                yy++;

                if (radiusError < 0) {
                    radiusError += 2 * yy + 1;
                }
                else {
                    xx--;
                    radiusError+= 2 * (yy - xx + 1);
                }
            }
        },
        draw: function () {
            var self = this;
            for (var i = 0; i < self.imageData.data.length; i += 4) {
                var x = (i / 4) % self.canvas.width;
                var y = Math.floor((i / 4) / self.canvas.width);

                self.imageData.data[i]     = self.data[y][x][0];
                self.imageData.data[i + 1] = self.data[y][x][1];
                self.imageData.data[i + 2] = self.data[y][x][2];

            };
            this.ctx.putImageData(this.imageData, 0, 0);

            this.retroDisplay.context.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, this.retroDisplay.width, this.retroDisplay.height);
        },
    };

    this.RetroScreen = RetroScreen;
})(this);