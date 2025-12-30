/**
 * VocalSignature - Radar chart for timbre fingerprint
 */
export class VocalSignature {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // 8 axes for radar chart - matching reference screenshot layout
        this.axes = [
            { name: 'SPECTRAL CENTROID', key: 'centroid', max: 10000, unit: 'Hz' },
            { name: 'SPECTRAL SPREAD', key: 'spread', max: 5000, unit: 'Hz' },
            { name: 'TONALITY', key: 'tonality', max: 1, unit: 'dB' },
            { name: 'SPECTRAL CREST', key: 'crest', max: 1, unit: '' },
            { name: 'SPECTRAL ENTROPY', key: 'entropy', max: 1, unit: '' },
            { name: 'SPECTRAL SLOPE', key: 'slope', max: 1, unit: 'dB/Hz' },
            { name: 'AMPLITUDE MODULATION', key: 'ampMod', max: 1, unit: 'Hz' },
            { name: 'FREQUENCY MODULATION', key: 'freqMod', max: 1, unit: '%' }
        ];

        // Current values (smoothed)
        this.values = new Array(8).fill(0);
        this.smoothing = 0.15;

        // Trail history
        this.history = [];
        this.maxHistory = 10;
    }

    resize() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * window.devicePixelRatio;
        this.canvas.height = rect.height * window.devicePixelRatio;
        this.ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        this.width = rect.width;
        this.height = rect.height;
        this.centerX = this.width / 2;
        this.centerY = this.height / 2;
        this.radius = Math.min(this.width, this.height) * 0.35;
    }

    /**
     * Update values from audio features
     */
    update(features) {
        // Calculate spectral crest (peak-to-average ratio)
        const spectralCrest = features.peak > 0 ? Math.min(1, features.peak / (features.rms + 0.001)) / 5 : 0;

        // Calculate spectral slope (approximation using centroid and spread)
        const spectralSlope = Math.min(1, (features.spectralCentroid / 10000) * (1 - features.spectralEntropy));

        const newValues = [
            features.spectralCentroid / this.axes[0].max,      // SPECTRAL CENTROID
            features.spectralSpread / this.axes[1].max,        // SPECTRAL SPREAD
            features.tonality,                                  // TONALITY
            spectralCrest,                                      // SPECTRAL CREST
            features.spectralEntropy,                           // SPECTRAL ENTROPY
            spectralSlope,                                      // SPECTRAL SLOPE
            features.amplitudeModulation,                       // AMPLITUDE MODULATION
            features.frequencyModulation                        // FREQUENCY MODULATION
        ];

        // Smooth values
        for (let i = 0; i < this.values.length; i++) {
            const target = Math.min(1, Math.max(0, newValues[i]));
            this.values[i] += (target - this.values[i]) * this.smoothing;
        }

        // Store history for trail effect
        this.history.push([...this.values]);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
    }

    /**
     * Get point on radar for axis and value
     */
    getPoint(axisIndex, value) {
        const angle = (axisIndex / this.axes.length) * Math.PI * 2 - Math.PI / 2;
        const r = value * this.radius;
        return {
            x: this.centerX + Math.cos(angle) * r,
            y: this.centerY + Math.sin(angle) * r
        };
    }

    render() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.fillStyle = 'rgba(20, 0, 30, 0.3)';
        ctx.fillRect(0, 0, w, h);

        // Draw concentric circles (grid)
        ctx.strokeStyle = 'rgba(200, 100, 255, 0.15)';
        ctx.lineWidth = 0.5;

        for (let i = 1; i <= 5; i++) {
            const r = (i / 5) * this.radius;
            ctx.beginPath();
            ctx.arc(this.centerX, this.centerY, r, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Draw axis lines
        ctx.strokeStyle = 'rgba(200, 100, 255, 0.3)';
        ctx.lineWidth = 1;

        for (let i = 0; i < this.axes.length; i++) {
            const point = this.getPoint(i, 1);
            ctx.beginPath();
            ctx.moveTo(this.centerX, this.centerY);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
        }

        // Draw axis labels
        ctx.font = '8px Inter, sans-serif';
        ctx.fillStyle = 'rgba(200, 150, 255, 0.7)';
        ctx.textAlign = 'center';

        for (let i = 0; i < this.axes.length; i++) {
            const point = this.getPoint(i, 1.15);

            // Adjust alignment based on position
            const angle = (i / this.axes.length) * Math.PI * 2 - Math.PI / 2;
            if (Math.abs(Math.cos(angle)) > 0.5) {
                ctx.textAlign = Math.cos(angle) > 0 ? 'left' : 'right';
            } else {
                ctx.textAlign = 'center';
            }

            ctx.fillText(this.axes[i].name, point.x, point.y);
        }

        // Draw history trails
        for (let h = 0; h < this.history.length; h++) {
            const histValues = this.history[h];
            const opacity = (h / this.history.length) * 0.3;

            ctx.beginPath();
            for (let i = 0; i < this.axes.length; i++) {
                const point = this.getPoint(i, histValues[i]);
                if (i === 0) {
                    ctx.moveTo(point.x, point.y);
                } else {
                    ctx.lineTo(point.x, point.y);
                }
            }
            ctx.closePath();
            ctx.strokeStyle = `rgba(255, 100, 200, ${opacity})`;
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw current shape
        ctx.beginPath();
        for (let i = 0; i < this.axes.length; i++) {
            const point = this.getPoint(i, this.values[i]);
            if (i === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        }
        ctx.closePath();

        // Fill
        const gradient = ctx.createRadialGradient(
            this.centerX, this.centerY, 0,
            this.centerX, this.centerY, this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 50, 150, 0.4)');
        gradient.addColorStop(1, 'rgba(150, 50, 255, 0.2)');
        ctx.fillStyle = gradient;
        ctx.fill();

        // Stroke
        ctx.strokeStyle = '#FF66CC';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw value points
        for (let i = 0; i < this.axes.length; i++) {
            const point = this.getPoint(i, this.values[i]);

            ctx.beginPath();
            ctx.arc(point.x, point.y, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#FFFFFF';
            ctx.fill();

            ctx.beginPath();
            ctx.arc(point.x, point.y, 6, 0, Math.PI * 2);
            ctx.strokeStyle = 'rgba(255, 100, 200, 0.5)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }

        // Draw value labels on axes
        ctx.font = '8px Inter, monospace';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';

        for (let i = 1; i <= 5; i++) {
            const val = (i / 5).toFixed(1);
            const y = this.centerY - (i / 5) * this.radius;
            ctx.fillText(val, this.centerX + 5, y);
        }
    }

    clear() {
        this.values.fill(0);
        this.history = [];
    }
}
