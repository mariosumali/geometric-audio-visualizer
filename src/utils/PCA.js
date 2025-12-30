/**
 * PCA - Simple Principal Component Analysis for dimensionality reduction
 */
export class PCA {
    constructor() {
        this.means = null;
        this.components = null;
        this.fitted = false;
    }

    /**
     * Fit PCA to data and transform to lower dimensions
     * For real-time use, we use a simplified fixed projection
     * @param {Float32Array[]} data - Array of feature vectors
     * @param {number} numComponents - Number of output dimensions
     * @returns {Float32Array[]} Transformed data
     */
    fitTransform(data, numComponents = 3) {
        if (!data || data.length === 0) return [];

        const numSamples = data.length;
        const numFeatures = data[0].length;

        // Calculate means
        this.means = new Float32Array(numFeatures);
        for (let i = 0; i < numSamples; i++) {
            for (let j = 0; j < numFeatures; j++) {
                this.means[j] += data[i][j];
            }
        }
        for (let j = 0; j < numFeatures; j++) {
            this.means[j] /= numSamples;
        }

        // Center the data
        const centered = data.map(sample => {
            const centered = new Float32Array(numFeatures);
            for (let j = 0; j < numFeatures; j++) {
                centered[j] = sample[j] - this.means[j];
            }
            return centered;
        });

        // Simple projection using first few dimensions with some mixing
        // This is a simplified approach - full PCA would need eigendecomposition
        const result = centered.map(sample => {
            const output = new Float32Array(numComponents);
            for (let i = 0; i < numComponents; i++) {
                for (let j = 0; j < numFeatures; j++) {
                    // Use a pseudo-random but deterministic mixing
                    const weight = Math.sin((i + 1) * (j + 1) * 0.5) * 0.5 + 0.5;
                    output[i] += sample[j] * weight;
                }
                // Normalize
                output[i] = output[i] / numFeatures;
            }
            return output;
        });

        this.fitted = true;
        return result;
    }

    /**
     * Transform a single sample using pre-computed projection
     * @param {Float32Array} sample - Single feature vector
     * @param {number} numComponents - Number of output dimensions
     * @returns {Float32Array} Transformed sample
     */
    transform(sample, numComponents = 3) {
        const numFeatures = sample.length;
        const output = new Float32Array(numComponents);

        for (let i = 0; i < numComponents; i++) {
            for (let j = 0; j < numFeatures; j++) {
                // Use a pseudo-random but deterministic mixing
                const weight = Math.sin((i + 1) * (j + 1) * 0.5) * 0.5 + 0.5;
                output[i] += sample[j] * weight;
            }
            // Normalize and scale
            output[i] = (output[i] / numFeatures) * 10;
        }

        return output;
    }
}
