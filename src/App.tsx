import React, { useState, useCallback } from 'react';
import * as THREE from 'three';
import { AudioProvider, useAudio } from './context/AudioContext';
import { Visualizer3D } from './components/Visualizer3D';
import { FileUploadPanel } from './components/FileUploadPanel';
import { PlaybackControls } from './components/PlaybackControls';
import { SettingsPanel } from './components/SettingsPanel';
import { ExportPanel } from './components/ExportPanel';
import { SpectrogramDisplay, WaveformDisplay } from './components/SpectrogramDisplay';

// Icons
const LogoIcon = () => (
    <svg viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="14" stroke="url(#logoGradient)" strokeWidth="2" />
        <circle cx="16" cy="16" r="8" stroke="url(#logoGradient)" strokeWidth="2" />
        <circle cx="16" cy="16" r="3" fill="url(#logoGradient)" />
        <path d="M16 2 L16 8 M16 24 L16 30 M2 16 L8 16 M24 16 L30 16" stroke="url(#logoGradient)" strokeWidth="1.5" />
        <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#4a9eff" />
                <stop offset="50%" stopColor="#4ade80" />
                <stop offset="100%" stopColor="#f97316" />
            </linearGradient>
        </defs>
    </svg>
);

const FolderIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="panel__icon">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

interface VisualizerSettings {
    particleCount: number;
    patternType: 'spiral' | 'wave' | 'scatter' | 'sphere';
    decayRate: number;
    showConnections: boolean;
    autoRotate: boolean;
    bloomIntensity: number;
}

const defaultSettings: VisualizerSettings = {
    particleCount: 800,
    patternType: 'spiral',
    decayRate: 1.0,
    showConnections: true,
    autoRotate: false,
    bloomIntensity: 0.8,
};

// Main content component (needs audio context)
const AppContent: React.FC = () => {
    const { file, audioData, isPlaying } = useAudio();
    const [settings, setSettings] = useState<VisualizerSettings>(defaultSettings);
    const [sceneRef, setSceneRef] = useState<THREE.Scene | null>(null);

    const handleSceneRef = useCallback((scene: THREE.Scene) => {
        setSceneRef(scene);
    }, []);

    return (
        <div className="app">
            {/* Header */}
            <header className="header">
                <div className="header__logo">
                    <LogoIcon />
                    <div>
                        <h1 className="header__title">Geometric Audio Visualizer</h1>
                        <span className="header__subtitle">Transform sound into 3D geometry</span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)' }}>
                    {isPlaying && (
                        <div className="animate-pulse" style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--spacing-sm)',
                            color: 'var(--freq-low)'
                        }}>
                            <div style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'var(--freq-low)',
                                boxShadow: '0 0 10px var(--freq-low)'
                            }} />
                            <span style={{ fontSize: 'var(--font-size-sm)' }}>Recording</span>
                        </div>
                    )}
                </div>
            </header>

            {/* Left Panel */}
            <div className="panel panel--left">
                <div className="panel__header">
                    <FolderIcon />
                    <span className="panel__title">Source</span>
                </div>
                <div className="panel__content">
                    <FileUploadPanel />

                    {file && (
                        <>
                            <SpectrogramDisplay />
                            <WaveformDisplay />

                            {/* Audio Stats */}
                            <div style={{ marginTop: 'var(--spacing-lg)' }}>
                                <div className="panel__header" style={{ padding: 0, marginBottom: 'var(--spacing-sm)', border: 'none' }}>
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="panel__icon">
                                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                                    </svg>
                                    <span className="panel__title">Audio Analysis</span>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: 'var(--spacing-sm)',
                                    fontSize: 'var(--font-size-xs)'
                                }}>
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        background: 'var(--glass-bg)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--glass-border)'
                                    }}>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Amplitude</div>
                                        <div style={{
                                            fontFamily: 'Monaco, monospace',
                                            color: 'var(--freq-low)',
                                            fontSize: 'var(--font-size-lg)'
                                        }}>
                                            {audioData.amplitude.toFixed(3)}
                                        </div>
                                    </div>
                                    <div style={{
                                        padding: 'var(--spacing-sm)',
                                        background: 'var(--glass-bg)',
                                        borderRadius: 'var(--radius-sm)',
                                        border: '1px solid var(--glass-border)'
                                    }}>
                                        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>Peak Freq</div>
                                        <div style={{
                                            fontFamily: 'Monaco, monospace',
                                            color: 'var(--freq-mid-high)',
                                            fontSize: 'var(--font-size-lg)'
                                        }}>
                                            {(audioData.dominantFrequency / 1000).toFixed(1)}k
                                        </div>
                                    </div>
                                </div>

                                {/* Frequency Bars */}
                                <div style={{
                                    marginTop: 'var(--spacing-md)',
                                    display: 'flex',
                                    gap: 3,
                                    height: 40,
                                    alignItems: 'flex-end'
                                }}>
                                    {audioData.frequencyBands.map((value, i) => (
                                        <div
                                            key={i}
                                            style={{
                                                flex: 1,
                                                height: `${Math.max(4, value * 100)}%`,
                                                background: `linear-gradient(to top, 
                          ${['#4a9eff', '#00d4aa', '#4ade80', '#fbbf24', '#f97316', '#ef4444'][i]}, 
                          transparent)`,
                                                borderRadius: 2,
                                                transition: 'height 100ms ease',
                                            }}
                                        />
                                    ))}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Viewport */}
            <div className="viewport">
                <Visualizer3D settings={settings} onSceneRef={handleSceneRef} />

                {/* Overlay Stats */}
                <div className="viewport__overlay">
                    <span className="viewport__stat">
                        Particles: {settings.particleCount}
                    </span>
                    <span className="viewport__stat">
                        Pattern: {settings.patternType}
                    </span>
                </div>

                {/* Empty state overlay */}
                {!file && (
                    <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        pointerEvents: 'none',
                    }}>
                        <div className="empty-state">
                            <svg viewBox="0 0 64 64" fill="none" stroke="currentColor" strokeWidth="1.5" className="empty-state__icon">
                                <circle cx="32" cy="32" r="28" />
                                <path d="M32 18 L32 46 M18 32 L46 32" />
                                <circle cx="32" cy="32" r="8" />
                            </svg>
                            <h3 className="empty-state__title">No audio loaded</h3>
                            <p className="empty-state__desc">
                                Upload an audio or video file using the panel on the left to begin visualization
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Panel - Settings & Export */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <SettingsPanel settings={settings} onSettingsChange={setSettings} />
                <div style={{ padding: 'var(--spacing-md)', paddingTop: 0 }}>
                    <ExportPanel scene={sceneRef} />
                </div>
            </div>

            {/* Bottom Controls */}
            <PlaybackControls />
        </div>
    );
};

// App wrapper with provider
const App: React.FC = () => {
    return (
        <AudioProvider>
            <AppContent />
        </AudioProvider>
    );
};

export default App;
