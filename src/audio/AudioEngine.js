/**
 * AudioEngine - Web Audio API wrapper for audio/video file playback and analysis
 */
export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.mediaElement = null;
        this.isPlaying = false;
        this.duration = 0;
        this.fftSize = 2048;

        // Data arrays
        this.frequencyData = null;
        this.timeDomainData = null;
    }

    /**
     * Initialize the audio context and analyser
     */
    async init() {
        this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        this.analyser = this.audioContext.createAnalyser();
        this.analyser.fftSize = this.fftSize;
        this.analyser.smoothingTimeConstant = 0.8;

        // Connect analyser to destination (speakers)
        this.analyser.connect(this.audioContext.destination);

        // Initialize data arrays
        this.frequencyData = new Uint8Array(this.analyser.frequencyBinCount);
        this.timeDomainData = new Uint8Array(this.analyser.fftSize);
    }

    /**
     * Load audio or video file
     * @param {File} file - Audio or video file
     * @returns {Promise<HTMLMediaElement>}
     */
    async loadFile(file) {
        if (!this.audioContext) {
            await this.init();
        }

        // Resume context if suspended
        if (this.audioContext.state === 'suspended') {
            await this.audioContext.resume();
        }

        // Clean up previous source
        if (this.source) {
            this.source.disconnect();
        }
        if (this.mediaElement) {
            this.mediaElement.pause();
            this.mediaElement.remove();
        }

        // Create media element based on file type
        const isVideo = file.type.startsWith('video/');
        this.mediaElement = document.createElement(isVideo ? 'video' : 'audio');
        this.mediaElement.src = URL.createObjectURL(file);
        this.mediaElement.crossOrigin = 'anonymous';

        // Wait for metadata to load
        await new Promise((resolve, reject) => {
            this.mediaElement.onloadedmetadata = resolve;
            this.mediaElement.onerror = reject;
        });

        this.duration = this.mediaElement.duration;

        // Create source and connect to analyser
        this.source = this.audioContext.createMediaElementSource(this.mediaElement);
        this.source.connect(this.analyser);

        return this.mediaElement;
    }

    /**
     * Play audio
     */
    async play() {
        if (this.mediaElement && this.audioContext) {
            if (this.audioContext.state === 'suspended') {
                await this.audioContext.resume();
            }
            await this.mediaElement.play();
            this.isPlaying = true;
        }
    }

    /**
     * Pause audio
     */
    pause() {
        if (this.mediaElement) {
            this.mediaElement.pause();
            this.isPlaying = false;
        }
    }

    /**
     * Toggle play/pause
     */
    async toggle() {
        if (this.isPlaying) {
            this.pause();
        } else {
            await this.play();
        }
    }

    /**
     * Seek to a specific time
     * @param {number} time - Time in seconds
     */
    seek(time) {
        if (this.mediaElement) {
            this.mediaElement.currentTime = Math.max(0, Math.min(time, this.duration));
        }
    }

    /**
     * Get current playback time
     * @returns {number}
     */
    getCurrentTime() {
        return this.mediaElement ? this.mediaElement.currentTime : 0;
    }

    /**
     * Get frequency data (magnitude spectrum)
     * @returns {Uint8Array}
     */
    getFrequencyData() {
        if (this.analyser) {
            this.analyser.getByteFrequencyData(this.frequencyData);
        }
        return this.frequencyData;
    }

    /**
     * Get time domain data (waveform)
     * @returns {Uint8Array}
     */
    getTimeDomainData() {
        if (this.analyser) {
            this.analyser.getByteTimeDomainData(this.timeDomainData);
        }
        return this.timeDomainData;
    }

    /**
     * Get sample rate
     * @returns {number}
     */
    getSampleRate() {
        return this.audioContext ? this.audioContext.sampleRate : 44100;
    }

    /**
     * Get frequency bin count
     * @returns {number}
     */
    getBinCount() {
        return this.analyser ? this.analyser.frequencyBinCount : 0;
    }
}
