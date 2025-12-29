import React, { useCallback, useState } from 'react';
import { useAudio } from '../context/AudioContext';

// Icons
const UploadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17,8 12,3 7,8" />
        <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
);

const FileAudioIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
    </svg>
);

const FileVideoIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <polygon points="10,8 16,12 10,16" />
    </svg>
);

const CloseIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const FolderIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
);

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export const FileUploadPanel: React.FC = () => {
    const { file, fileName, fileType, duration, loadFile, removeFile } = useAudio();
    const [isDragging, setIsDragging] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile && (droppedFile.type.startsWith('audio/') || droppedFile.type.startsWith('video/'))) {
            setIsLoading(true);
            await loadFile(droppedFile);
            setIsLoading(false);
        }
    }, [loadFile]);

    const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) {
            setIsLoading(true);
            await loadFile(selectedFile);
            setIsLoading(false);
        }
    }, [loadFile]);

    if (isLoading) {
        return (
            <div className="file-upload file-upload--active">
                <div className="loading">
                    <div className="loading__spinner" />
                    <span>Processing audio...</span>
                </div>
            </div>
        );
    }

    if (file) {
        return (
            <div className="file-info animate-fade-in">
                <div className="file-info__icon">
                    {fileType === 'video' ? <FileVideoIcon /> : <FileAudioIcon />}
                </div>
                <div className="file-info__details">
                    <div className="file-info__name">{fileName}</div>
                    <div className="file-info__meta">
                        {formatFileSize(file.size)} • {formatDuration(duration)}
                    </div>
                </div>
                <button className="file-info__remove" onClick={removeFile} title="Remove file">
                    <CloseIcon />
                </button>
            </div>
        );
    }

    return (
        <label
            className={`file-upload ${isDragging ? 'file-upload--active' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
        >
            <input
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
            />
            <div className="file-upload__icon">
                <UploadIcon />
            </div>
            <div className="file-upload__title">Drop audio or video file</div>
            <div className="file-upload__subtitle">or click to browse</div>
            <div className="file-upload__formats">MP3, WAV, OGG, MP4, WEBM</div>
        </label>
    );
};

export default FileUploadPanel;
