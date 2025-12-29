import React, { useCallback, useRef, useState, useEffect } from 'react';
import { useAudio } from '../context/AudioContext';

// Icons
const PlayIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <polygon points="5,3 19,12 5,21" />
    </svg>
);

const PauseIcon = () => (
    <svg viewBox="0 0 24 24" fill="currentColor">
        <rect x="6" y="4" width="4" height="16" />
        <rect x="14" y="4" width="4" height="16" />
    </svg>
);

const VolumeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
        <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
    </svg>
);

const VolumeMutedIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11,5 6,9 2,9 2,15 6,15 11,19" />
        <line x1="23" y1="9" x2="17" y2="15" />
        <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
);

const SkipBackIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="19,20 9,12 19,4" />
        <line x1="5" y1="4" x2="5" y2="20" />
    </svg>
);

const SkipForwardIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="5,4 15,12 5,20" />
        <line x1="19" y1="4" x2="19" y2="20" />
    </svg>
);

const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const PlaybackControls: React.FC = () => {
    const {
        file,
        isPlaying,
        currentTime,
        duration,
        volume,
        play,
        pause,
        seek,
        setVolume
    } = useAudio();

    const [isSeeking, setIsSeeking] = useState(false);
    const [seekValue, setSeekValue] = useState(0);
    const [previousVolume, setPreviousVolume] = useState(0.75);
    const progressRef = useRef<HTMLDivElement>(null);

    // Update seek value when not seeking
    useEffect(() => {
        if (!isSeeking) {
            setSeekValue(currentTime);
        }
    }, [currentTime, isSeeking]);

    const handlePlayPause = useCallback(() => {
        if (isPlaying) {
            pause();
        } else {
            play();
        }
    }, [isPlaying, play, pause]);

    const handleSeekStart = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressRef.current || !file) return;

        setIsSeeking(true);
        const rect = progressRef.current.getBoundingClientRect();
        const percentage = (e.clientX - rect.left) / rect.width;
        const time = percentage * duration;
        setSeekValue(time);
    }, [duration, file]);

    const handleSeekMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!isSeeking || !progressRef.current) return;

        const rect = progressRef.current.getBoundingClientRect();
        const percentage = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const time = percentage * duration;
        setSeekValue(time);
    }, [isSeeking, duration]);

    const handleSeekEnd = useCallback(() => {
        if (isSeeking) {
            seek(seekValue);
            setIsSeeking(false);
        }
    }, [isSeeking, seek, seekValue]);

    const handleVolumeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const newVolume = parseFloat(e.target.value);
        setVolume(newVolume);
        if (newVolume > 0) {
            setPreviousVolume(newVolume);
        }
    }, [setVolume]);

    const toggleMute = useCallback(() => {
        if (volume > 0) {
            setPreviousVolume(volume);
            setVolume(0);
        } else {
            setVolume(previousVolume);
        }
    }, [volume, previousVolume, setVolume]);

    const handleSkipBack = useCallback(() => {
        seek(Math.max(0, currentTime - 10));
    }, [seek, currentTime]);

    const handleSkipForward = useCallback(() => {
        seek(Math.min(duration, currentTime + 10));
    }, [seek, currentTime, duration]);

    const progressPercentage = duration > 0 ? (seekValue / duration) * 100 : 0;

    return (
        <div className="controls">
            {/* Skip Back */}
            <button
                className="btn btn--icon"
                onClick={handleSkipBack}
                disabled={!file}
                title="Skip back 10s"
            >
                <SkipBackIcon />
            </button>

            {/* Play/Pause */}
            <button
                className={`play-btn ${isPlaying ? 'play-btn--playing' : ''}`}
                onClick={handlePlayPause}
                disabled={!file}
                title={isPlaying ? 'Pause' : 'Play'}
            >
                {isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            {/* Skip Forward */}
            <button
                className="btn btn--icon"
                onClick={handleSkipForward}
                disabled={!file}
                title="Skip forward 10s"
            >
                <SkipForwardIcon />
            </button>

            {/* Time Slider */}
            <div className="time-slider">
                <div
                    className="time-slider__track"
                    ref={progressRef}
                    onMouseDown={handleSeekStart}
                    onMouseMove={handleSeekMove}
                    onMouseUp={handleSeekEnd}
                    onMouseLeave={handleSeekEnd}
                >
                    <div
                        className="time-slider__progress"
                        style={{ width: `${progressPercentage}%` }}
                    />
                    <div
                        className="time-slider__handle"
                        style={{ left: `${progressPercentage}%` }}
                    />
                </div>
                <div className="time-slider__times">
                    <span>{formatTime(seekValue)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>

            {/* Volume */}
            <div className="volume">
                <button className="btn btn--icon" onClick={toggleMute} title={volume === 0 ? 'Unmute' : 'Mute'}>
                    {volume === 0 ? <VolumeMutedIcon /> : <VolumeIcon />}
                </button>
                <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="setting__slider"
                    style={{ width: '80px' }}
                />
            </div>
        </div>
    );
};

export default PlaybackControls;
