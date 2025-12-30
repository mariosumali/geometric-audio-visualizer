/**
 * ColorScale - Color mapping utilities for visualizations
 */

/**
 * Convert HSL to RGB hex string
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} Hex color string
 */
export function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    const toHex = (n) => Math.round((n + m) * 255).toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert HSL to RGB array
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {number[]} RGB array [r, g, b] with values 0-255
 */
export function hslToRgb(h, s, l) {
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = l - c / 2;

    let r, g, b;
    if (h < 60) { r = c; g = x; b = 0; }
    else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; }
    else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; }
    else { r = c; g = 0; b = x; }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

/**
 * Get color from spectral/frequency value (rainbow scale)
 * @param {number} value - Normalized value 0-1
 * @returns {string} CSS color string
 */
export function spectralColor(value) {
    // Map 0-1 to rainbow hue (270 -> 0, purple to red)
    const hue = (1 - value) * 270;
    return hslToHex(hue, 85, 55);
}

/**
 * Get color from spectral flux (cold to hot)
 * @param {number} value - Normalized value 0-1
 * @returns {string} CSS color string
 */
export function fluxColor(value) {
    // Cold (blue) to hot (red/yellow)
    if (value < 0.5) {
        // Blue to cyan
        const hue = 240 - value * 60;
        return hslToHex(hue, 80, 50 + value * 20);
    } else {
        // Cyan to yellow to red
        const hue = 180 - (value - 0.5) * 360;
        return hslToHex(Math.max(0, hue), 90, 55);
    }
}

/**
 * Get color for amplitude (dark to bright)
 * @param {number} value - Normalized value 0-1
 * @returns {string} CSS color string
 */
export function amplitudeColor(value) {
    // Magenta/pink spectrum
    const hue = 320 + value * 30;
    const lightness = 30 + value * 40;
    return hslToHex(hue % 360, 80, lightness);
}

/**
 * Interpolate between two colors
 * @param {string} color1 - Start color (hex)
 * @param {string} color2 - End color (hex)
 * @param {number} t - Interpolation factor 0-1
 * @returns {string} Interpolated color (hex)
 */
export function lerpColor(color1, color2, t) {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);

    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);

    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/**
 * Create a gradient color array
 * @param {string[]} colors - Array of hex colors
 * @param {number} steps - Number of steps
 * @returns {string[]} Array of interpolated colors
 */
export function createGradient(colors, steps) {
    const result = [];
    const segments = colors.length - 1;
    const stepsPerSegment = Math.floor(steps / segments);

    for (let i = 0; i < segments; i++) {
        for (let j = 0; j < stepsPerSegment; j++) {
            const t = j / stepsPerSegment;
            result.push(lerpColor(colors[i], colors[i + 1], t));
        }
    }

    return result;
}

// Predefined color schemes
export const ColorSchemes = {
    panel: {
        toneMap: '#00CED1', // Dark cyan
        pitchMap: '#2E8B57', // Sea green
        vocalSignature: '#4B0082', // Indigo
        manifold: '#8B0000', // Dark red
        toneEvolution: '#C71585', // Medium violet red
        timbreSpace: '#006400' // Dark green
    },
    accent: {
        cyan: '#00FFFF',
        magenta: '#FF00FF',
        yellow: '#FFFF00',
        green: '#00FF00',
        red: '#FF4444',
        blue: '#4444FF'
    }
};
