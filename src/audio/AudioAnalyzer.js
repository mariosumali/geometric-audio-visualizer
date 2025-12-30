/**
 * AudioAnalyzer - Real-time audio feature extraction
 */
export class AudioAnalyzer {
    constructor(audioEngine) {
        this.engine = audioEngine;
        this.prevSpectrum = null;

        // Mel filterbank setup (simplified)
        this.numMelFilters = 26;
        this.numMFCCs = 13;
    }

    /**
     * Calculate RMS (Root Mean Square) amplitude
     * @returns {number} RMS value between 0 and 1
     */
    getRMS() {
        const timeDomain = this.engine.getTimeDomainData();
        if (!timeDomain || timeDomain.length === 0) return 0;

        let sum = 0;
        for (let i = 0; i < timeDomain.length; i++) {
            const normalized = (timeDomain[i] - 128) / 128;
            sum += normalized * normalized;
        }
        return Math.sqrt(sum / timeDomain.length);
    }

    /**
     * Get peak amplitude
     * @returns {number} Peak value between 0 and 1
     */
    getPeak() {
        const timeDomain = this.engine.getTimeDomainData();
        if (!timeDomain || timeDomain.length === 0) return 0;

        let max = 0;
        for (let i = 0; i < timeDomain.length; i++) {
            const normalized = Math.abs(timeDomain[i] - 128) / 128;
            if (normalized > max) max = normalized;
        }
        return max;
    }

    /**
     * Calculate Spectral Centroid (brightness)
     * @returns {number} Centroid frequency in Hz
     */
    getSpectralCentroid() {
        const spectrum = this.engine.getFrequencyData();
        if (!spectrum || spectrum.length === 0) return 0;

        const sampleRate = this.engine.getSampleRate();
        const binCount = spectrum.length;
        const freqPerBin = sampleRate / (binCount * 2);

        let weightedSum = 0;
        let sum = 0;

        for (let i = 0; i < binCount; i++) {
            const magnitude = spectrum[i];
            const frequency = i * freqPerBin;
            weightedSum += magnitude * frequency;
            sum += magnitude;
        }

        return sum > 0 ? weightedSum / sum : 0;
    }

    /**
     * Calculate Spectral Spread (standard deviation around centroid)
     * @returns {number} Spread in Hz
     */
    getSpectralSpread() {
        const spectrum = this.engine.getFrequencyData();
        if (!spectrum || spectrum.length === 0) return 0;

        const centroid = this.getSpectralCentroid();
        const sampleRate = this.engine.getSampleRate();
        const binCount = spectrum.length;
        const freqPerBin = sampleRate / (binCount * 2);

        let weightedVariance = 0;
        let sum = 0;

        for (let i = 0; i < binCount; i++) {
            const magnitude = spectrum[i];
            const frequency = i * freqPerBin;
            const diff = frequency - centroid;
            weightedVariance += magnitude * diff * diff;
            sum += magnitude;
        }

        return sum > 0 ? Math.sqrt(weightedVariance / sum) : 0;
    }

    /**
     * Calculate Spectral Flux (frame-to-frame change)
     * @returns {number} Flux value
     */
    getSpectralFlux() {
        const spectrum = this.engine.getFrequencyData();
        if (!spectrum || spectrum.length === 0) return 0;

        // Create copy of current spectrum
        const currentSpectrum = new Uint8Array(spectrum);

        if (!this.prevSpectrum) {
            this.prevSpectrum = currentSpectrum;
            return 0;
        }

        let flux = 0;
        for (let i = 0; i < currentSpectrum.length; i++) {
            const diff = currentSpectrum[i] - this.prevSpectrum[i];
            // Only count positive differences (onset detection)
            flux += diff > 0 ? diff : 0;
        }

        this.prevSpectrum = currentSpectrum;
        return flux / currentSpectrum.length;
    }

    /**
     * Calculate Spectral Entropy (complexity/randomness)
     * @returns {number} Entropy value between 0 and 1
     */
    getSpectralEntropy() {
        const spectrum = this.engine.getFrequencyData();
        if (!spectrum || spectrum.length === 0) return 0;

        // Normalize spectrum to probability distribution
        let sum = 0;
        for (let i = 0; i < spectrum.length; i++) {
            sum += spectrum[i] + 1; // Add 1 to avoid log(0)
        }

        if (sum === 0) return 0;

        let entropy = 0;
        const maxEntropy = Math.log2(spectrum.length);

        for (let i = 0; i < spectrum.length; i++) {
            const p = (spectrum[i] + 1) / sum;
            if (p > 0) {
                entropy -= p * Math.log2(p);
            }
        }

        return entropy / maxEntropy; // Normalize to 0-1
    }

    /**
     * Estimate Tonality (harmonic vs. noise ratio, simplified)
     * @returns {number} Tonality value between 0 and 1
     */
    getTonality() {
        const spectrum = this.engine.getFrequencyData();
        if (!spectrum || spectrum.length === 0) return 0;

        // Find peaks in spectrum (harmonic content)
        let peakEnergy = 0;
        let totalEnergy = 0;

        for (let i = 1; i < spectrum.length - 1; i++) {
            const val = spectrum[i];
            totalEnergy += val;

            // Check if this is a local peak
            if (val > spectrum[i - 1] && val > spectrum[i + 1] && val > 10) {
                peakEnergy += val;
            }
        }

        return totalEnergy > 0 ? Math.min(1, peakEnergy / totalEnergy * 3) : 0;
    }

    /**
     * Detect fundamental frequency F0 (pitch) using autocorrelation
     * @returns {number} Detected pitch in Hz
     */
    getPitch() {
        const timeDomain = this.engine.getTimeDomainData();
        if (!timeDomain || timeDomain.length === 0) return 0;

        const sampleRate = this.engine.getSampleRate();
        const bufferSize = timeDomain.length;

        // Normalize the signal
        const signal = new Float32Array(bufferSize);
        for (let i = 0; i < bufferSize; i++) {
            signal[i] = (timeDomain[i] - 128) / 128;
        }

        // Autocorrelation
        const minPeriod = Math.floor(sampleRate / 1000); // 1000 Hz max
        const maxPeriod = Math.floor(sampleRate / 50);   // 50 Hz min

        let bestPeriod = 0;
        let bestCorrelation = 0;

        for (let period = minPeriod; period < Math.min(maxPeriod, bufferSize / 2); period++) {
            let correlation = 0;
            for (let i = 0; i < bufferSize - period; i++) {
                correlation += signal[i] * signal[i + period];
            }

            if (correlation > bestCorrelation) {
                bestCorrelation = correlation;
                bestPeriod = period;
            }
        }

        return bestPeriod > 0 ? sampleRate / bestPeriod : 0;
    }

    /**
     * Calculate amplitude modulation (variation in amplitude over short window)
     * @returns {number} Modulation value between 0 and 1
     */
    getAmplitudeModulation() {
        const timeDomain = this.engine.getTimeDomainData();
        if (!timeDomain || timeDomain.length === 0) return 0;

        // Calculate envelope variation
        const windowSize = 64;
        const envelopes = [];

        for (let i = 0; i < timeDomain.length - windowSize; i += windowSize) {
            let max = 0;
            for (let j = 0; j < windowSize; j++) {
                max = Math.max(max, Math.abs(timeDomain[i + j] - 128));
            }
            envelopes.push(max);
        }

        if (envelopes.length < 2) return 0;

        // Calculate variance of envelope
        const mean = envelopes.reduce((a, b) => a + b, 0) / envelopes.length;
        const variance = envelopes.reduce((acc, val) => acc + (val - mean) ** 2, 0) / envelopes.length;

        return Math.min(1, Math.sqrt(variance) / 64);
    }

    /**
     * Calculate frequency modulation (vibrato/wobble)
     * @returns {number} Modulation value between 0 and 1
     */
    getFrequencyModulation() {
        // Simplified: use spectral flux as proxy
        return Math.min(1, this.getSpectralFlux() / 10);
    }

    /**
     * Get simplified MFCCs (Mel-Frequency Cepstral Coefficients)
     * @returns {Float32Array} Array of MFCC values
     */
    getMFCCs() {
        const spectrum = this.engine.getFrequencyData();
        if (!spectrum || spectrum.length === 0) {
            return new Float32Array(this.numMFCCs);
        }

        const sampleRate = this.engine.getSampleRate();
        const binCount = spectrum.length;

        // Convert to mel scale and apply filterbank
        const melSpectrum = this._applyMelFilterbank(spectrum, sampleRate, binCount);

        // Apply log compression
        const logMelSpectrum = melSpectrum.map(val => Math.log(val + 1));

        // Apply DCT to get MFCCs
        const mfccs = this._dct(logMelSpectrum, this.numMFCCs);

        return mfccs;
    }

    /**
     * Apply mel filterbank to spectrum
     * @private
     */
    _applyMelFilterbank(spectrum, sampleRate, binCount) {
        const melSpectrum = new Float32Array(this.numMelFilters);
        const maxFreq = sampleRate / 2;

        // Mel scale conversion
        const freqToMel = (f) => 2595 * Math.log10(1 + f / 700);
        const melToFreq = (m) => 700 * (Math.pow(10, m / 2595) - 1);

        const minMel = freqToMel(0);
        const maxMel = freqToMel(maxFreq);
        const melStep = (maxMel - minMel) / (this.numMelFilters + 1);

        for (let i = 0; i < this.numMelFilters; i++) {
            const centerMel = minMel + (i + 1) * melStep;
            const centerFreq = melToFreq(centerMel);
            const lowFreq = melToFreq(centerMel - melStep);
            const highFreq = melToFreq(centerMel + melStep);

            const lowBin = Math.floor(lowFreq / maxFreq * binCount);
            const centerBin = Math.floor(centerFreq / maxFreq * binCount);
            const highBin = Math.floor(highFreq / maxFreq * binCount);

            let sum = 0;
            // Triangular filter
            for (let j = lowBin; j < highBin && j < binCount; j++) {
                let weight;
                if (j < centerBin) {
                    weight = (j - lowBin) / (centerBin - lowBin);
                } else {
                    weight = (highBin - j) / (highBin - centerBin);
                }
                sum += spectrum[j] * Math.max(0, weight);
            }
            melSpectrum[i] = sum;
        }

        return melSpectrum;
    }

    /**
     * Apply Discrete Cosine Transform
     * @private
     */
    _dct(input, numCoeffs) {
        const output = new Float32Array(numCoeffs);
        const N = input.length;

        for (let k = 0; k < numCoeffs; k++) {
            let sum = 0;
            for (let n = 0; n < N; n++) {
                sum += input[n] * Math.cos(Math.PI * k * (n + 0.5) / N);
            }
            output[k] = sum;
        }

        return output;
    }

    /**
     * Get all features as an object
     * @returns {Object} All computed features
     */
    getAllFeatures() {
        return {
            rms: this.getRMS(),
            peak: this.getPeak(),
            spectralCentroid: this.getSpectralCentroid(),
            spectralSpread: this.getSpectralSpread(),
            spectralFlux: this.getSpectralFlux(),
            spectralEntropy: this.getSpectralEntropy(),
            tonality: this.getTonality(),
            pitch: this.getPitch(),
            amplitudeModulation: this.getAmplitudeModulation(),
            frequencyModulation: this.getFrequencyModulation(),
            mfccs: this.getMFCCs()
        };
    }
}
