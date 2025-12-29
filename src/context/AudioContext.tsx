import React, { createContext, useContext, useState, useRef, useCallback, useEffect } from 'react';

interface AudioData {
    frequencyData: Uint8Array;
    timeDomainData: Uint8Array;
    amplitude: number;
    dominantFrequency: number;
    frequencyBands: number[];
}

interface AudioContextState {
    // File
    file: File | null;
    fileName: string;
    fileType: 'audio' | 'video' | null;

    // Playback
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    volume: number;

    // Audio data
    audioData: AudioData;

    // Methods
    loadFile: (file: File) => Promise<void>;
    play: () => void;
    pause: () => void;
    seek: (time: number) => void;
    setVolume: (volume: number) => void;
    removeFile: () => void;
}

const defaultAudioData: AudioData = {
    frequencyData: new Uint8Array(1024),
    timeDomainData: new Uint8Array(1024),
    amplitude: 0,
    dominantFrequency: 0,
    frequencyBands: [0, 0, 0, 0, 0, 0],
};

const AudioContext = createContext<AudioContextState | null>(null);

export const useAudio = () => {
    const context = useContext(AudioContext);
    if (!context) {
        throw new Error('useAudio must be used within AudioProvider');
    }
    return context;
};

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState('');
    const [fileType, setFileType] = useState<'audio' | 'video' | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [volume, setVolumeState] = useState(0.75);
    const [audioData, setAudioData] = useState<AudioData>(defaultAudioData);

    // Refs
    const audioContextRef = useRef<globalThis.AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const mediaElementRef = useRef<HTMLAudioElement | HTMLVideoElement | null>(null);
    const animationFrameRef = useRef<number>(0);
    const frequencyDataRef = useRef<Uint8Array>(new Uint8Array(1024));
    const timeDomainDataRef = useRef<Uint8Array>(new Uint8Array(1024));

    // Initialize audio context
    const initAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new window.AudioContext();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 2048;
            analyserRef.current.smoothingTimeConstant = 0.8;

            const bufferLength = analyserRef.current.frequencyBinCount;
            frequencyDataRef.current = new Uint8Array(bufferLength);
            timeDomainDataRef.current = new Uint8Array(bufferLength);
        }
        return audioContextRef.current;
    }, []);

    // Analyze audio data
    const analyze = useCallback(() => {
        if (!analyserRef.current || !isPlaying) return;

        analyserRef.current.getByteFrequencyData(frequencyDataRef.current);
        analyserRef.current.getByteTimeDomainData(timeDomainDataRef.current);

        // Calculate amplitude (RMS)
        let sum = 0;
        for (let i = 0; i < timeDomainDataRef.current.length; i++) {
            const value = (timeDomainDataRef.current[i] - 128) / 128;
            sum += value * value;
        }
        const amplitude = Math.sqrt(sum / timeDomainDataRef.current.length);

        // Find dominant frequency
        let maxValue = 0;
        let maxIndex = 0;
        for (let i = 0; i < frequencyDataRef.current.length; i++) {
            if (frequencyDataRef.current[i] > maxValue) {
                maxValue = frequencyDataRef.current[i];
                maxIndex = i;
            }
        }

        const sampleRate = audioContextRef.current?.sampleRate || 44100;
        const nyquist = sampleRate / 2;
        const dominantFrequency = (maxIndex / frequencyDataRef.current.length) * nyquist;

        // Calculate frequency bands (6 bands from 0-8kHz+)
        const bandSize = Math.floor(frequencyDataRef.current.length / 6);
        const frequencyBands: number[] = [];
        for (let band = 0; band < 6; band++) {
            let bandSum = 0;
            const start = band * bandSize;
            const end = start + bandSize;
            for (let i = start; i < end; i++) {
                bandSum += frequencyDataRef.current[i];
            }
            frequencyBands.push(bandSum / bandSize / 255);
        }

        setAudioData({
            frequencyData: new Uint8Array(frequencyDataRef.current),
            timeDomainData: new Uint8Array(timeDomainDataRef.current),
            amplitude,
            dominantFrequency,
            frequencyBands,
        });

        animationFrameRef.current = requestAnimationFrame(analyze);
    }, [isPlaying]);

    // Start analysis loop
    useEffect(() => {
        if (isPlaying) {
            animationFrameRef.current = requestAnimationFrame(analyze);
        } else {
            cancelAnimationFrame(animationFrameRef.current);
        }
        return () => cancelAnimationFrame(animationFrameRef.current);
    }, [isPlaying, analyze]);

    // Load file
    const loadFile = useCallback(async (newFile: File) => {
        const audioContext = initAudioContext();

        // Determine file type
        const isVideo = newFile.type.startsWith('video/');
        setFileType(isVideo ? 'video' : 'audio');

        // Create media element
        if (mediaElementRef.current) {
            mediaElementRef.current.pause();
            URL.revokeObjectURL(mediaElementRef.current.src);
        }

        const element = isVideo ? document.createElement('video') : document.createElement('audio');
        element.src = URL.createObjectURL(newFile);
        element.crossOrigin = 'anonymous';

        // Wait for metadata
        await new Promise<void>((resolve) => {
            element.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });

        // Connect to audio context
        if (sourceRef.current) {
            sourceRef.current.disconnect();
        }

        sourceRef.current = audioContext.createMediaElementSource(element);
        sourceRef.current.connect(analyserRef.current!);
        analyserRef.current!.connect(audioContext.destination);

        element.volume = volume;
        mediaElementRef.current = element;

        // Update state
        setFile(newFile);
        setFileName(newFile.name);
        setDuration(element.duration);
        setCurrentTime(0);

        // Time update listener
        element.addEventListener('timeupdate', () => {
            setCurrentTime(element.currentTime);
        });

        element.addEventListener('ended', () => {
            setIsPlaying(false);
        });
    }, [initAudioContext, volume]);

    // Play
    const play = useCallback(async () => {
        if (!mediaElementRef.current) return;

        if (audioContextRef.current?.state === 'suspended') {
            await audioContextRef.current.resume();
        }

        await mediaElementRef.current.play();
        setIsPlaying(true);
    }, []);

    // Pause
    const pause = useCallback(() => {
        if (!mediaElementRef.current) return;
        mediaElementRef.current.pause();
        setIsPlaying(false);
    }, []);

    // Seek
    const seek = useCallback((time: number) => {
        if (!mediaElementRef.current) return;
        mediaElementRef.current.currentTime = time;
        setCurrentTime(time);
    }, []);

    // Set volume
    const setVolume = useCallback((newVolume: number) => {
        if (mediaElementRef.current) {
            mediaElementRef.current.volume = newVolume;
        }
        setVolumeState(newVolume);
    }, []);

    // Remove file
    const removeFile = useCallback(() => {
        if (mediaElementRef.current) {
            mediaElementRef.current.pause();
            URL.revokeObjectURL(mediaElementRef.current.src);
            mediaElementRef.current = null;
        }
        if (sourceRef.current) {
            sourceRef.current.disconnect();
            sourceRef.current = null;
        }
        setFile(null);
        setFileName('');
        setFileType(null);
        setIsPlaying(false);
        setCurrentTime(0);
        setDuration(0);
        setAudioData(defaultAudioData);
    }, []);

    // Cleanup
    useEffect(() => {
        return () => {
            if (mediaElementRef.current) {
                mediaElementRef.current.pause();
                URL.revokeObjectURL(mediaElementRef.current.src);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const value: AudioContextState = {
        file,
        fileName,
        fileType,
        isPlaying,
        currentTime,
        duration,
        volume,
        audioData,
        loadFile,
        play,
        pause,
        seek,
        setVolume,
        removeFile,
    };

    return (
        <AudioContext.Provider value={value}>
            {children}
        </AudioContext.Provider>
    );
};

export default AudioContext;
