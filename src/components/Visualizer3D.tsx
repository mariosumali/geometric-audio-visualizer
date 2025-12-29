import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import { AudioParticles } from './AudioParticles';
import { useAudio } from '../context/AudioContext';

interface VisualizerSettings {
    particleCount: number;
    patternType: 'spiral' | 'wave' | 'scatter' | 'sphere';
    decayRate: number;
    showConnections: boolean;
    autoRotate: boolean;
    bloomIntensity: number;
}

interface Visualizer3DProps {
    settings: VisualizerSettings;
    onSceneRef?: (scene: THREE.Scene) => void;
}

// Camera controller for auto-rotation
const CameraController: React.FC<{ autoRotate: boolean }> = ({ autoRotate }) => {
    const { camera } = useThree();
    const angleRef = useRef(0);

    useFrame((_, delta) => {
        if (autoRotate) {
            angleRef.current += delta * 0.2;
            const radius = 12;
            camera.position.x = Math.sin(angleRef.current) * radius;
            camera.position.z = Math.cos(angleRef.current) * radius;
            camera.lookAt(0, 0, 0);
        }
    });

    return null;
};

// Grid helper
const Grid: React.FC = () => {
    return (
        <group>
            <gridHelper
                args={[40, 40, 0x1a1a25, 0x1a1a25]}
                position={[0, -5, 0]}
            />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5.01, 0]}>
                <planeGeometry args={[40, 40]} />
                <meshBasicMaterial
                    color={0x0a0a0f}
                    transparent
                    opacity={0.8}
                />
            </mesh>
        </group>
    );
};

// Ambient particles (background)
const AmbientParticles: React.FC = () => {
    const pointsRef = useRef<THREE.Points>(null);
    const count = 500;

    const positions = React.useMemo(() => {
        const pos = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 30;
            pos[i * 3 + 1] = (Math.random() - 0.5) * 30;
            pos[i * 3 + 2] = (Math.random() - 0.5) * 30;
        }
        return pos;
    }, []);

    useFrame((state) => {
        if (pointsRef.current) {
            pointsRef.current.rotation.y = state.clock.elapsedTime * 0.02;
        }
    });

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={count}
                    array={positions}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.03}
                color={0x4a9eff}
                transparent
                opacity={0.3}
                sizeAttenuation
            />
        </points>
    );
};

// Scene content
const SceneContent: React.FC<Visualizer3DProps> = ({ settings, onSceneRef }) => {
    const { gl, scene } = useThree();
    const { file } = useAudio();

    React.useEffect(() => {
        if (onSceneRef) {
            onSceneRef(scene);
        }
    }, [scene, onSceneRef]);

    // Set renderer settings
    React.useEffect(() => {
        gl.setClearColor(0x0a0a0f);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.2;
    }, [gl]);

    return (
        <>
            {/* Lighting */}
            <ambientLight intensity={0.3} />
            <pointLight position={[10, 10, 10]} intensity={0.5} color={0x4a9eff} />
            <pointLight position={[-10, -10, -10]} intensity={0.3} color={0xef4444} />

            {/* Camera controller */}
            <CameraController autoRotate={settings.autoRotate} />

            {/* Background particles */}
            <AmbientParticles />

            {/* Grid */}
            <Grid />

            {/* Main audio visualization */}
            {file && (
                <AudioParticles
                    particleCount={settings.particleCount}
                    patternType={settings.patternType}
                    decayRate={settings.decayRate}
                    showConnections={settings.showConnections}
                />
            )}

            {/* Controls */}
            <OrbitControls
                enablePan
                enableZoom
                enableRotate
                minDistance={5}
                maxDistance={30}
                makeDefault
            />
        </>
    );
};

export const Visualizer3D: React.FC<Visualizer3DProps> = ({ settings, onSceneRef }) => {
    return (
        <Canvas
            className="viewport__canvas"
            camera={{ position: [0, 5, 12], fov: 60 }}
            dpr={[1, 2]}
            gl={{
                antialias: true,
                alpha: false,
                preserveDrawingBuffer: true
            }}
        >
            <Suspense fallback={null}>
                <SceneContent settings={settings} onSceneRef={onSceneRef} />
                <EffectComposer>
                    <Bloom
                        intensity={settings.bloomIntensity}
                        luminanceThreshold={0.2}
                        luminanceSmoothing={0.9}
                    />
                </EffectComposer>
            </Suspense>
        </Canvas>
    );
};

export default Visualizer3D;
