import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAudio } from '../context/AudioContext';

interface AudioParticlesProps {
    particleCount: number;
    patternType: 'spiral' | 'wave' | 'scatter' | 'sphere';
    decayRate: number;
    showConnections: boolean;
}

interface Particle {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    color: THREE.Color;
    size: number;
    lifetime: number;
    maxLifetime: number;
    emissionTime: number;
    frequencyBand: number;
    amplitude: number;
}

// Frequency band colors (2kHz to 8kHz+)
const FREQUENCY_COLORS = [
    new THREE.Color(0x4a9eff), // Low - Blue
    new THREE.Color(0x00d4aa), // Mid-low - Cyan
    new THREE.Color(0x4ade80), // Mid - Green
    new THREE.Color(0xfbbf24), // Mid-high - Yellow
    new THREE.Color(0xf97316), // High - Orange
    new THREE.Color(0xef4444), // Ultra - Red
];

export const AudioParticles: React.FC<AudioParticlesProps> = ({
    particleCount,
    patternType,
    decayRate,
    showConnections,
}) => {
    const { audioData, isPlaying, currentTime } = useAudio();
    const pointsRef = useRef<THREE.Points>(null);
    const linesRef = useRef<THREE.LineSegments>(null);
    const particlesRef = useRef<Particle[]>([]);
    const emissionTimerRef = useRef(0);
    const startTimeRef = useRef(0);

    // Initialize geometry
    const { positions, colors, sizes } = useMemo(() => {
        const positions = new Float32Array(particleCount * 3);
        const colors = new Float32Array(particleCount * 3);
        const sizes = new Float32Array(particleCount);

        for (let i = 0; i < particleCount; i++) {
            positions[i * 3] = 0;
            positions[i * 3 + 1] = 0;
            positions[i * 3 + 2] = 0;
            colors[i * 3] = 0.3;
            colors[i * 3 + 1] = 0.6;
            colors[i * 3 + 2] = 1;
            sizes[i] = 0;
        }

        return { positions, colors, sizes };
    }, [particleCount]);

    // Line geometry for connections
    const linePositions = useMemo(() => {
        return new Float32Array(particleCount * particleCount * 6);
    }, [particleCount]);

    // Initialize particles array
    useEffect(() => {
        particlesRef.current = [];
        for (let i = 0; i < particleCount; i++) {
            particlesRef.current.push({
                position: new THREE.Vector3(0, 0, 0),
                velocity: new THREE.Vector3(0, 0, 0),
                color: new THREE.Color(0x4a9eff),
                size: 0,
                lifetime: 0,
                maxLifetime: 5,
                emissionTime: 0,
                frequencyBand: 0,
                amplitude: 0,
            });
        }
    }, [particleCount]);

    // Reset on play start
    useEffect(() => {
        if (isPlaying && currentTime < 0.1) {
            startTimeRef.current = performance.now() / 1000;
            emissionTimerRef.current = 0;
        }
    }, [isPlaying, currentTime]);

    // Pattern generators
    const getPatternPosition = (
        index: number,
        time: number,
        amplitude: number,
        frequencyBand: number
    ): THREE.Vector3 => {
        const pos = new THREE.Vector3();
        const t = time + index * 0.1;
        const amp = amplitude * 3;

        switch (patternType) {
            case 'spiral': {
                const angle = t * 2 + index * 0.3;
                const radius = 2 + amp + (index % 10) * 0.2;
                const height = (frequencyBand - 2.5) * 2;
                pos.set(
                    Math.cos(angle) * radius,
                    height + Math.sin(t * 3) * amp * 0.5,
                    Math.sin(angle) * radius
                );
                break;
            }
            case 'wave': {
                const x = (index % 20 - 10) * 0.5;
                const z = (Math.floor(index / 20) % 20 - 10) * 0.5;
                const y = Math.sin(x * 0.5 + t * 2) * amp +
                    Math.cos(z * 0.5 + t * 1.5) * amp * 0.5 +
                    (frequencyBand - 2.5) * 0.5;
                pos.set(x, y, z);
                break;
            }
            case 'scatter': {
                const phi = Math.acos(-1 + (2 * index) / particleCount);
                const theta = Math.sqrt(particleCount * Math.PI) * phi + t;
                const radius = 3 + amp * 2 + frequencyBand * 0.3;
                pos.setFromSpherical(new THREE.Spherical(radius, phi, theta));
                pos.y += Math.sin(t * 2 + index * 0.1) * amp * 0.3;
                break;
            }
            case 'sphere': {
                const phi = Math.acos(-1 + (2 * (index + t * 10)) / particleCount);
                const theta = Math.sqrt(particleCount * Math.PI) * phi;
                const baseRadius = 2 + frequencyBand * 0.5;
                const radius = baseRadius + amp * 1.5 * Math.sin(t * 3 + index * 0.2);
                pos.setFromSpherical(new THREE.Spherical(radius, phi, theta));
                break;
            }
        }

        return pos;
    };

    // Animation frame
    useFrame((state, delta) => {
        if (!pointsRef.current) return;

        const geometry = pointsRef.current.geometry;
        const positionAttr = geometry.attributes.position as THREE.BufferAttribute;
        const colorAttr = geometry.attributes.color as THREE.BufferAttribute;
        const sizeAttr = geometry.attributes.size as THREE.BufferAttribute;

        const time = state.clock.elapsedTime;
        const { amplitude, frequencyBands } = audioData;

        // Emit new particles based on audio
        if (isPlaying) {
            emissionTimerRef.current += delta;
            const emissionRate = 0.016; // ~60fps emission

            while (emissionTimerRef.current >= emissionRate) {
                emissionTimerRef.current -= emissionRate;

                // Find dead particle to reuse
                const deadParticle = particlesRef.current.find(p => p.lifetime <= 0);
                if (deadParticle && amplitude > 0.01) {
                    // Find dominant frequency band
                    let dominantBand = 0;
                    let maxBand = 0;
                    for (let b = 0; b < frequencyBands.length; b++) {
                        if (frequencyBands[b] > maxBand) {
                            maxBand = frequencyBands[b];
                            dominantBand = b;
                        }
                    }

                    deadParticle.lifetime = 3 + Math.random() * 2;
                    deadParticle.maxLifetime = deadParticle.lifetime;
                    deadParticle.emissionTime = currentTime;
                    deadParticle.frequencyBand = dominantBand;
                    deadParticle.amplitude = amplitude;
                    deadParticle.color.copy(FREQUENCY_COLORS[dominantBand]);
                    deadParticle.size = (0.05 + amplitude * 0.15) * 20;

                    const idx = particlesRef.current.indexOf(deadParticle);
                    const pos = getPatternPosition(idx, time, amplitude, dominantBand);
                    deadParticle.position.copy(pos);
                    deadParticle.velocity.set(
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1,
                        (Math.random() - 0.5) * 0.1
                    );
                }
            }
        }

        // Update particles
        const activeParticles: Particle[] = [];
        for (let i = 0; i < particlesRef.current.length; i++) {
            const particle = particlesRef.current[i];

            if (particle.lifetime > 0) {
                // Decay
                particle.lifetime -= delta * decayRate;
                const lifeRatio = Math.max(0, particle.lifetime / particle.maxLifetime);

                // Apply velocity with damping
                particle.position.add(particle.velocity.clone().multiplyScalar(delta));
                particle.velocity.multiplyScalar(0.98);

                // Subtle oscillation
                if (isPlaying) {
                    const oscAmp = audioData.amplitude * 0.02;
                    particle.position.x += Math.sin(time * 5 + i) * oscAmp;
                    particle.position.y += Math.cos(time * 4 + i * 0.5) * oscAmp;
                }

                // Update geometry
                positionAttr.setXYZ(i, particle.position.x, particle.position.y, particle.position.z);
                colorAttr.setXYZ(
                    i,
                    particle.color.r * lifeRatio + 0.1,
                    particle.color.g * lifeRatio + 0.1,
                    particle.color.b * lifeRatio + 0.1
                );
                sizeAttr.setX(i, particle.size * lifeRatio);

                activeParticles.push(particle);
            } else {
                // Hidden particle
                positionAttr.setXYZ(i, 0, 0, 0);
                sizeAttr.setX(i, 0);
            }
        }

        positionAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;

        // Update connection lines
        if (showConnections && linesRef.current && activeParticles.length > 1) {
            const lineGeom = linesRef.current.geometry;
            const linePos = lineGeom.attributes.position as THREE.BufferAttribute;

            let lineIndex = 0;
            const maxDistance = 2.5;

            for (let i = 0; i < activeParticles.length && lineIndex < particleCount * 3; i++) {
                for (let j = i + 1; j < activeParticles.length && lineIndex < particleCount * 3; j++) {
                    const dist = activeParticles[i].position.distanceTo(activeParticles[j].position);
                    if (dist < maxDistance) {
                        linePos.setXYZ(lineIndex * 2,
                            activeParticles[i].position.x,
                            activeParticles[i].position.y,
                            activeParticles[i].position.z
                        );
                        linePos.setXYZ(lineIndex * 2 + 1,
                            activeParticles[j].position.x,
                            activeParticles[j].position.y,
                            activeParticles[j].position.z
                        );
                        lineIndex++;
                    }
                }
            }

            // Clear remaining lines
            for (let i = lineIndex * 2; i < linePos.count; i++) {
                linePos.setXYZ(i, 0, 0, 0);
            }

            linePos.needsUpdate = true;
        }
    });

    return (
        <group>
            <points ref={pointsRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particleCount}
                        array={positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={particleCount}
                        array={colors}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-size"
                        count={particleCount}
                        array={sizes}
                        itemSize={1}
                    />
                </bufferGeometry>
                <shaderMaterial
                    vertexColors
                    transparent
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    vertexShader={`
            attribute float size;
            varying vec3 vColor;
            void main() {
              vColor = color;
              vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
              gl_PointSize = size * (300.0 / -mvPosition.z);
              gl_Position = projectionMatrix * mvPosition;
            }
          `}
                    fragmentShader={`
            varying vec3 vColor;
            void main() {
              float r = distance(gl_PointCoord, vec2(0.5));
              if (r > 0.5) discard;
              float alpha = 1.0 - smoothstep(0.3, 0.5, r);
              gl_FragColor = vec4(vColor, alpha);
            }
          `}
                />
            </points>

            {showConnections && (
                <lineSegments ref={linesRef}>
                    <bufferGeometry>
                        <bufferAttribute
                            attach="attributes-position"
                            count={particleCount * 6}
                            array={linePositions}
                            itemSize={3}
                        />
                    </bufferGeometry>
                    <lineBasicMaterial
                        color={0x4a9eff}
                        transparent
                        opacity={0.15}
                        blending={THREE.AdditiveBlending}
                    />
                </lineSegments>
            )}
        </group>
    );
};

export default AudioParticles;
