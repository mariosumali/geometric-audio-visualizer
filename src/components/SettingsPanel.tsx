import React from 'react';

interface VisualizerSettings {
    particleCount: number;
    patternType: 'spiral' | 'wave' | 'scatter' | 'sphere';
    decayRate: number;
    showConnections: boolean;
    autoRotate: boolean;
    bloomIntensity: number;
}

interface SettingsPanelProps {
    settings: VisualizerSettings;
    onSettingsChange: (settings: VisualizerSettings) => void;
}

const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="panel__icon">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
);

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onSettingsChange }) => {
    const updateSetting = <K extends keyof VisualizerSettings>(
        key: K,
        value: VisualizerSettings[K]
    ) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <div className="panel panel--right">
            <div className="panel__header">
                <SettingsIcon />
                <span className="panel__title">Visualization</span>
            </div>

            <div className="panel__content">
                {/* Pattern Type */}
                <div className="setting">
                    <div className="setting__label">
                        <span className="setting__name">Pattern</span>
                    </div>
                    <div className="select-group">
                        {(['spiral', 'wave', 'scatter', 'sphere'] as const).map((pattern) => (
                            <button
                                key={pattern}
                                className={`select-group__option ${settings.patternType === pattern ? 'select-group__option--active' : ''}`}
                                onClick={() => updateSetting('patternType', pattern)}
                            >
                                {pattern.charAt(0).toUpperCase() + pattern.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Particle Density */}
                <div className="setting">
                    <div className="setting__label">
                        <span className="setting__name">Particle Density</span>
                        <span className="setting__value">{settings.particleCount}</span>
                    </div>
                    <input
                        type="range"
                        className="setting__slider"
                        min="200"
                        max="2000"
                        step="100"
                        value={settings.particleCount}
                        onChange={(e) => updateSetting('particleCount', parseInt(e.target.value))}
                    />
                </div>

                {/* Decay Rate */}
                <div className="setting">
                    <div className="setting__label">
                        <span className="setting__name">Decay Rate</span>
                        <span className="setting__value">{settings.decayRate.toFixed(1)}x</span>
                    </div>
                    <input
                        type="range"
                        className="setting__slider"
                        min="0.2"
                        max="3"
                        step="0.1"
                        value={settings.decayRate}
                        onChange={(e) => updateSetting('decayRate', parseFloat(e.target.value))}
                    />
                </div>

                {/* Bloom Intensity */}
                <div className="setting">
                    <div className="setting__label">
                        <span className="setting__name">Glow Intensity</span>
                        <span className="setting__value">{settings.bloomIntensity.toFixed(1)}</span>
                    </div>
                    <input
                        type="range"
                        className="setting__slider"
                        min="0"
                        max="2"
                        step="0.1"
                        value={settings.bloomIntensity}
                        onChange={(e) => updateSetting('bloomIntensity', parseFloat(e.target.value))}
                    />
                </div>

                <div className="divider" />

                {/* Toggles */}
                <div className="toggle">
                    <span className="toggle__label">Show Connections</span>
                    <div
                        className={`toggle__switch ${settings.showConnections ? 'toggle__switch--active' : ''}`}
                        onClick={() => updateSetting('showConnections', !settings.showConnections)}
                    >
                        <div className="toggle__knob" />
                    </div>
                </div>

                <div className="toggle">
                    <span className="toggle__label">Auto Rotate</span>
                    <div
                        className={`toggle__switch ${settings.autoRotate ? 'toggle__switch--active' : ''}`}
                        onClick={() => updateSetting('autoRotate', !settings.autoRotate)}
                    >
                        <div className="toggle__knob" />
                    </div>
                </div>

                <div className="divider" />

                {/* Frequency Legend */}
                <div className="setting">
                    <div className="setting__label">
                        <span className="setting__name">Frequency Colors</span>
                    </div>
                    <div className="freq-legend">
                        <div className="freq-legend__bar" />
                    </div>
                    <div className="freq-legend__labels">
                        <span>2kHz</span>
                        <span>4kHz</span>
                        <span>6kHz</span>
                        <span>8kHz+</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsPanel;
