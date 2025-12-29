import React, { useCallback } from 'react';
import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';

interface ExportPanelProps {
    scene: THREE.Scene | null;
}

const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="panel__icon">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7,10 12,15 17,10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

const CubeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27,6.96 12,12.01 20.73,6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
);

const FileJsonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <path d="M10 12a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 1 1 1v1a1 1 0 0 0 1 1" />
        <path d="M14 18a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1 1 1 0 0 1-1-1v-1a1 1 0 0 0-1-1" />
    </svg>
);

const FileCodeIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14,2 14,8 20,8" />
        <polyline points="8,13 6,15 8,17" />
        <polyline points="16,13 18,15 16,17" />
    </svg>
);

export const ExportPanel: React.FC<ExportPanelProps> = ({ scene }) => {
    const downloadFile = useCallback((content: string | ArrayBuffer, filename: string, type: string) => {
        const blob = new Blob([content], { type });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }, []);

    const exportGLTF = useCallback(async () => {
        if (!scene) return;

        const exporter = new GLTFExporter();

        try {
            const gltf = await exporter.parseAsync(scene, {
                binary: true,
                onlyVisible: true,
            });

            downloadFile(
                gltf as ArrayBuffer,
                `audio-geometry-${Date.now()}.glb`,
                'model/gltf-binary'
            );
        } catch (error) {
            console.error('GLTF export failed:', error);
        }
    }, [scene, downloadFile]);

    const exportOBJ = useCallback(() => {
        if (!scene) return;

        const exporter = new OBJExporter();
        const result = exporter.parse(scene);

        downloadFile(
            result,
            `audio-geometry-${Date.now()}.obj`,
            'text/plain'
        );
    }, [scene, downloadFile]);

    const exportPointCloud = useCallback(() => {
        if (!scene) return;

        const points: Array<{ x: number; y: number; z: number; color: string }> = [];

        scene.traverse((object) => {
            if (object instanceof THREE.Points) {
                const geometry = object.geometry;
                const positions = geometry.attributes.position;
                const colors = geometry.attributes.color;

                for (let i = 0; i < positions.count; i++) {
                    const x = positions.getX(i);
                    const y = positions.getY(i);
                    const z = positions.getZ(i);

                    // Skip zero positions (inactive particles)
                    if (x === 0 && y === 0 && z === 0) continue;

                    let color = '#ffffff';
                    if (colors) {
                        const r = Math.round(colors.getX(i) * 255);
                        const g = Math.round(colors.getY(i) * 255);
                        const b = Math.round(colors.getZ(i) * 255);
                        color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
                    }

                    points.push({ x, y, z, color });
                }
            }
        });

        const data = {
            metadata: {
                type: 'AudioGeometryPointCloud',
                version: '1.0',
                timestamp: new Date().toISOString(),
                count: points.length,
            },
            points,
        };

        downloadFile(
            JSON.stringify(data, null, 2),
            `audio-pointcloud-${Date.now()}.json`,
            'application/json'
        );
    }, [scene, downloadFile]);

    const isDisabled = !scene;

    return (
        <div style={{ marginTop: 'var(--spacing-lg)' }}>
            <div className="panel__header" style={{ padding: 0, marginBottom: 'var(--spacing-md)', border: 'none' }}>
                <DownloadIcon />
                <span className="panel__title">Export</span>
            </div>

            <div className="export-options">
                <button
                    className="export-option"
                    onClick={exportGLTF}
                    disabled={isDisabled}
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                >
                    <div className="export-option__icon">
                        <CubeIcon />
                    </div>
                    <div className="export-option__info">
                        <div className="export-option__name">GLTF / GLB</div>
                        <div className="export-option__desc">Best for web & 3D software</div>
                    </div>
                </button>

                <button
                    className="export-option"
                    onClick={exportOBJ}
                    disabled={isDisabled}
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                >
                    <div className="export-option__icon">
                        <FileCodeIcon />
                    </div>
                    <div className="export-option__info">
                        <div className="export-option__name">OBJ</div>
                        <div className="export-option__desc">Universal 3D format</div>
                    </div>
                </button>

                <button
                    className="export-option"
                    onClick={exportPointCloud}
                    disabled={isDisabled}
                    style={{ opacity: isDisabled ? 0.5 : 1 }}
                >
                    <div className="export-option__icon">
                        <FileJsonIcon />
                    </div>
                    <div className="export-option__info">
                        <div className="export-option__name">Point Cloud (JSON)</div>
                        <div className="export-option__desc">Raw coordinate data</div>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ExportPanel;
