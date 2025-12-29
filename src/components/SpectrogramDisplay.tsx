import React, { useRef, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

const WaveformIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="panel__icon">
        <path d="M2 12h2l3-9 4 18 4-9 3 5h4" />
    </svg>
);

export const SpectrogramDisplay: React.FC = () => {
    const { audioData, isPlaying } = useAudio();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const historyRef = useRef<Uint8Array[]>([]);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Background
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, width, height);

        if (!isPlaying && historyRef.current.length === 0) {
            // Empty state
            ctx.fillStyle = '#64748b';
            ctx.font = '12px Inter';
            ctx.textAlign = 'center';
            ctx.fillText('Audio spectrogram will appear here', width / 2, height / 2);
            return;
        }

        // Add current frequency data to history
        if (isPlaying && audioData.frequencyData.length > 0) {
            historyRef.current.push(new Uint8Array(audioData.frequencyData));
            if (historyRef.current.length > width) {
                historyRef.current.shift();
            }
        }

        // Draw spectrogram
        const barWidth = 1;
        const frequencyBins = 128; // Only show first 128 bins (lower frequencies are more interesting)

        for (let x = 0; x < historyRef.current.length; x++) {
            const data = historyRef.current[x];
            const binHeight = height / frequencyBins;

            for (let y = 0; y < frequencyBins; y++) {
                const value = data[y] / 255;

                // Color mapping based on frequency and intensity
                const hue = 220 - y * 2; // Blue to red
                const saturation = 70 + value * 30;
                const lightness = value * 50;

                ctx.fillStyle = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
                ctx.fillRect(x * barWidth, height - (y + 1) * binHeight, barWidth, binHeight);
            }
        }
    }, [audioData, isPlaying]);

    return (
        <div className="spectrogram">
            <canvas
                ref={canvasRef}
                className="spectrogram__canvas"
                width={248}
                height={100}
            />
            <div className="spectrogram__legend">
                <span>0 Hz</span>
                <span>22 kHz</span>
            </div>
        </div>
    );
};

// Waveform display component
export const WaveformDisplay: React.FC = () => {
    const { audioData, isPlaying } = useAudio();
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.fillStyle = '#12121a';
        ctx.fillRect(0, 0, width, height);

        if (!isPlaying) {
            // Flat line when not playing
            ctx.strokeStyle = '#4a9eff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(0, height / 2);
            ctx.lineTo(width, height / 2);
            ctx.stroke();
            return;
        }

        // Draw waveform
        const data = audioData.timeDomainData;
        const sliceWidth = width / data.length;

        // Gradient stroke
        const gradient = ctx.createLinearGradient(0, 0, width, 0);
        gradient.addColorStop(0, '#4a9eff');
        gradient.addColorStop(0.5, '#4ade80');
        gradient.addColorStop(1, '#f97316');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.beginPath();

        let x = 0;
        for (let i = 0; i < data.length; i++) {
            const v = data[i] / 128.0;
            const y = (v * height) / 2;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.stroke();
    }, [audioData, isPlaying]);

    return (
        <div className="spectrogram" style={{ marginTop: 'var(--spacing-md)' }}>
            <div className="panel__header" style={{ padding: 'var(--spacing-sm)', border: 'none' }}>
                <WaveformIcon />
                <span className="panel__title" style={{ fontSize: 'var(--font-size-xs)' }}>Waveform</span>
            </div>
            <canvas
                ref={canvasRef}
                className="spectrogram__canvas"
                width={248}
                height={60}
            />
        </div>
    );
};

export default SpectrogramDisplay;
