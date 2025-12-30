/**
 * PitchMap - Centroid + F₀ vs Time visualization
 */
export class PitchMap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Data buffers (rolling window)
        this.bufferSize = 300;
        this.centroidBuffer = new Array(this.bufferSize).fill(0);
        this.pitchBuffer = new Array(this.bufferSize).fill(0);
        this.gapBuffer = new Array(this.bufferSize).fill(0);
        this.index = 0;

        // Ranges
        this.freqRange = { min: 0, max: 5000 }; // Hz

        // Styling
        this.padding = { top: 30, right: 20, bottom: 40, left: 60 };
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
    }

    /**
     * Add new data point
     */
    addData(centroid, pitch) {
        this.centroidBuffer[this.index] = centroid;
        this.pitchBuffer[this.index] = pitch;
        this.gapBuffer[this.index] = Math.abs(centroid - pitch);
        this.index = (this.index + 1) % this.bufferSize;
    }

    mapY(value) {
        const range = this.freqRange.max - this.freqRange.min;
        const plotHeight = this.height - this.padding.top - this.padding.bottom;
        return this.height - this.padding.bottom - ((value - this.freqRange.min) / range) * plotHeight;
    }

    mapX(bufferIndex) {
        const plotWidth = this.width - this.padding.left - this.padding.right;
        return this.padding.left + (bufferIndex / this.bufferSize) * plotWidth;
    }

    /**
     * Draw a line from buffer data
     */
    drawLine(buffer, color, lineWidth = 1.5) {
        const ctx = this.ctx;
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth;
        ctx.beginPath();

        let started = false;
        for (let i = 0; i < this.bufferSize; i++) {
            const bufferIdx = (this.index + i) % this.bufferSize;
            const value = buffer[bufferIdx];

            if (value > 0) {
                const x = this.mapX(i);
                const y = this.mapY(Math.min(value, this.freqRange.max));

                if (!started) {
                    ctx.moveTo(x, y);
                    started = true;
                } else {
                    ctx.lineTo(x, y);
                }
            }
        }

        ctx.stroke();
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear with fade
        ctx.fillStyle = 'rgba(0, 30, 20, 0.3)';
        ctx.fillRect(0, 0, w, h);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 255, 128, 0.1)';
        ctx.lineWidth = 0.5;

        const plotHeight = h - this.padding.top - this.padding.bottom;
        const plotWidth = w - this.padding.left - this.padding.right;

        // Horizontal grid lines
        for (let i = 0; i <= 5; i++) {
            const y = this.padding.top + (i / 5) * plotHeight;
            ctx.beginPath();
            ctx.moveTo(this.padding.left, y);
            ctx.lineTo(w - this.padding.right, y);
            ctx.stroke();
        }

        // Draw gap area (filled)
        ctx.fillStyle = 'rgba(255, 100, 100, 0.15)';
        ctx.beginPath();

        for (let i = 0; i < this.bufferSize; i++) {
            const bufferIdx = (this.index + i) % this.bufferSize;
            const centroid = this.centroidBuffer[bufferIdx];
            const pitch = this.pitchBuffer[bufferIdx];

            if (centroid > 0 && pitch > 0) {
                const x = this.mapX(i);
                const y1 = this.mapY(Math.min(centroid, this.freqRange.max));
                const y2 = this.mapY(Math.min(pitch, this.freqRange.max));

                if (i === 0) {
                    ctx.moveTo(x, y1);
                } else {
                    ctx.lineTo(x, y1);
                }
            }
        }

        for (let i = this.bufferSize - 1; i >= 0; i--) {
            const bufferIdx = (this.index + i) % this.bufferSize;
            const pitch = this.pitchBuffer[bufferIdx];

            if (pitch > 0) {
                const x = this.mapX(i);
                const y = this.mapY(Math.min(pitch, this.freqRange.max));
                ctx.lineTo(x, y);
            }
        }

        ctx.closePath();
        ctx.fill();

        // Draw lines
        this.drawLine(this.centroidBuffer, '#00FFFF', 2); // Cyan - Centroid
        this.drawLine(this.pitchBuffer, '#00FF88', 1.5);  // Green - Pitch

        // Draw axes
        ctx.strokeStyle = 'rgba(0, 255, 128, 0.5)';
        ctx.lineWidth = 1;

        // Y axis
        ctx.beginPath();
        ctx.moveTo(this.padding.left, this.padding.top);
        ctx.lineTo(this.padding.left, h - this.padding.bottom);
        ctx.stroke();

        // X axis
        ctx.beginPath();
        ctx.moveTo(this.padding.left, h - this.padding.bottom);
        ctx.lineTo(w - this.padding.right, h - this.padding.bottom);
        ctx.stroke();

        // Labels
        ctx.fillStyle = '#00FF88';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('TIME', w / 2, h - 8);

        // Y axis label
        ctx.save();
        ctx.translate(12, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('FREQUENCY (Hz)', 0, 0);
        ctx.restore();

        // Y axis ticks
        ctx.font = '9px Inter, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillStyle = 'rgba(0, 255, 128, 0.6)';

        for (let i = 0; i <= 5; i++) {
            const freq = this.freqRange.max - (i / 5) * this.freqRange.max;
            const y = this.padding.top + (i / 5) * plotHeight;
            ctx.fillText(`${freq >= 1000 ? (freq / 1000).toFixed(1) + 'k' : freq}`, this.padding.left - 8, y + 4);
        }

        // Legend
        this.drawLegend();
    }

    drawLegend() {
        const ctx = this.ctx;
        const legendX = this.width - 130;
        const legendY = 15;

        ctx.font = '9px Inter, sans-serif';

        // Centroid
        ctx.fillStyle = '#00FFFF';
        ctx.fillRect(legendX, legendY - 5, 12, 3);
        ctx.fillText('SPECTRAL CENTROID', legendX + 18, legendY);

        // Pitch
        ctx.fillStyle = '#00FF88';
        ctx.fillRect(legendX, legendY + 10, 12, 3);
        ctx.fillText('DETECTED F₀', legendX + 18, legendY + 15);

        // Gap
        ctx.fillStyle = 'rgba(255, 100, 100, 0.5)';
        ctx.fillRect(legendX, legendY + 25, 12, 8);
        ctx.fillStyle = '#FF6666';
        ctx.fillText('CENTROID-F₀ GAP', legendX + 18, legendY + 32);
    }

    clear() {
        this.centroidBuffer.fill(0);
        this.pitchBuffer.fill(0);
        this.gapBuffer.fill(0);
        this.index = 0;
    }
}
