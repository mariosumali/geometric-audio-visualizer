/**
 * ToneMap - Amplitude vs Spectral Centroid scatter plot
 */
import { fluxColor } from '../utils/ColorScale.js';

export class ToneMap {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.points = [];
        this.maxPoints = 500;

        // Axis ranges - matching reference screenshot
        this.centroidRange = { min: 0, max: 15000 }; // 15 kHz max
        this.amplitudeRange = { min: 0, max: 0.7 }; // 0.70 max

        // Styling
        this.padding = 50;
        this.pointSize = 3;
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
     * Add a new point from audio features
     */
    addPoint(centroid, amplitude, flux) {
        this.points.push({
            centroid,
            amplitude,
            flux,
            age: 0
        });

        // Remove old points
        if (this.points.length > this.maxPoints) {
            this.points.shift();
        }
    }

    /**
     * Map value to canvas coordinates
     */
    mapX(value) {
        const range = this.centroidRange.max - this.centroidRange.min;
        return this.padding + ((value - this.centroidRange.min) / range) * (this.width - this.padding * 2);
    }

    mapY(value) {
        const range = this.amplitudeRange.max - this.amplitudeRange.min;
        return this.height - this.padding - ((value - this.amplitudeRange.min) / range) * (this.height - this.padding * 2);
    }

    /**
     * Render the visualization
     */
    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.fillStyle = 'rgba(0, 20, 30, 0.3)';
        ctx.fillRect(0, 0, w, h);

        // Draw grid
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.lineWidth = 0.5;

        // Vertical grid lines (centroid)
        for (let i = 0; i <= 10; i++) {
            const x = this.mapX(i * 1000);
            ctx.beginPath();
            ctx.moveTo(x, this.padding);
            ctx.lineTo(x, h - this.padding);
            ctx.stroke();
        }

        // Horizontal grid lines (amplitude)
        for (let i = 0; i <= 10; i++) {
            const y = this.mapY(i * 0.1);
            ctx.beginPath();
            ctx.moveTo(this.padding, y);
            ctx.lineTo(w - this.padding, y);
            ctx.stroke();
        }

        // Draw axes
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
        ctx.lineWidth = 1;

        // X axis
        ctx.beginPath();
        ctx.moveTo(this.padding, h - this.padding);
        ctx.lineTo(w - this.padding, h - this.padding);
        ctx.stroke();

        // Y axis
        ctx.beginPath();
        ctx.moveTo(this.padding, this.padding);
        ctx.lineTo(this.padding, h - this.padding);
        ctx.stroke();

        // Draw trail connections between recent points
        if (this.points.length > 1) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.lineWidth = 1;
            ctx.beginPath();

            // Only connect last 20 points to show current "trail"
            const trailStart = Math.max(0, this.points.length - 20);
            for (let i = trailStart; i < this.points.length; i++) {
                const point = this.points[i];
                const x = this.mapX(point.centroid);
                const y = this.mapY(point.amplitude);

                if (i === trailStart) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            }
            ctx.stroke();
        }

        // Draw points
        for (let i = 0; i < this.points.length; i++) {
            const point = this.points[i];
            const x = this.mapX(point.centroid);
            const y = this.mapY(point.amplitude);

            // Age-based opacity
            const opacity = 1 - (point.age / this.maxPoints) * 0.8;

            // Flux-based color
            const normalizedFlux = Math.min(1, point.flux / 30);
            const color = fluxColor(normalizedFlux);

            ctx.beginPath();
            ctx.arc(x, y, this.pointSize, 0, Math.PI * 2);
            ctx.fillStyle = color;
            ctx.globalAlpha = opacity;
            ctx.fill();

            // Glow effect for high flux
            if (normalizedFlux > 0.5) {
                ctx.beginPath();
                ctx.arc(x, y, this.pointSize * 2, 0, Math.PI * 2);
                ctx.fillStyle = color;
                ctx.globalAlpha = opacity * 0.3;
                ctx.fill();
            }

            point.age++;
        }

        ctx.globalAlpha = 1;

        // Labels
        ctx.fillStyle = '#00FFFF';
        ctx.font = '11px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('SPECTRAL CENTROID', w / 2, h - 10);

        ctx.save();
        ctx.translate(15, h / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('AMPLITUDE', 0, 0);
        ctx.restore();

        // Axis tick labels
        ctx.font = '9px Inter, sans-serif';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.6)';

        // X axis ticks - 0.0 KHz to 15.0 KHz format
        for (let i = 0; i <= 10; i++) {
            const freq = (i / 10) * 15000; // 0 to 15000 Hz
            const x = this.mapX(freq);
            const kHz = freq / 1000;
            if (i % 2 === 0) { // Show every other label to avoid crowding
                ctx.fillText(`${kHz.toFixed(1)} KHz`, x, h - this.padding + 15);
            }
        }

        // Y axis ticks - 0.07 to 0.70 format
        ctx.textAlign = 'right';
        for (let i = 1; i <= 10; i++) {
            const amp = (i / 10) * 0.7;
            const y = this.mapY(amp);
            ctx.fillText(amp.toFixed(2), this.padding - 8, y + 4);
        }

        // Legend
        this.drawLegend();
    }

    drawLegend() {
        const ctx = this.ctx;
        const legendX = this.width - 120;
        const legendY = 20;

        ctx.font = '10px Inter, sans-serif';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.fillText('SPECTRAL FLUX', legendX, legendY);

        // Gradient bar
        const gradient = ctx.createLinearGradient(legendX, legendY + 5, legendX + 80, legendY + 5);
        gradient.addColorStop(0, fluxColor(0));
        gradient.addColorStop(0.5, fluxColor(0.5));
        gradient.addColorStop(1, fluxColor(1));

        ctx.fillStyle = gradient;
        ctx.fillRect(legendX, legendY + 8, 80, 8);
    }

    /**
     * Clear all points
     */
    clear() {
        this.points = [];
    }
}
