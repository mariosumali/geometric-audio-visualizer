/**
 * ToneEvolution - Tonality vs Centroid vs Time 3D visualization
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ToneEvolution {
    constructor(container) {
        this.container = container;

        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        // Trail data
        this.maxPoints = 500;
        this.trailPositions = new Float32Array(this.maxPoints * 3);
        this.trailColors = new Float32Array(this.maxPoints * 3);
        this.pointIndex = 0;
        this.time = 0;

        // Particle data for scatter points
        this.particles = [];
        this.maxParticles = 200;

        this.init();
    }

    init() {
        // Renderer setup
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x100010, 0.3);
        this.container.appendChild(this.renderer.domElement);

        // Camera position
        this.camera.position.set(20, 12, 20);
        this.camera.lookAt(5, 5, 0);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.2;

        // Create trail line
        this.trailGeometry = new THREE.BufferGeometry();
        this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(this.trailPositions, 3));
        this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(this.trailColors, 3));

        const trailMaterial = new THREE.LineBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            linewidth: 2
        });

        this.trail = new THREE.Line(this.trailGeometry, trailMaterial);
        this.scene.add(this.trail);

        // Create current position indicator with glow
        const sphereGeom = new THREE.SphereGeometry(0.25, 16, 16);
        const sphereMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.95
        });
        this.currentMarker = new THREE.Mesh(sphereGeom, sphereMat);
        this.scene.add(this.currentMarker);

        // Outer glow for marker
        const glowGeom = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMat = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.3
        });
        this.markerGlow = new THREE.Mesh(glowGeom, glowMat);
        this.scene.add(this.markerGlow);

        // Add 3D grid structure
        this.add3DGrid();

        // Add axes with labels
        this.addAxes();

        // Create particle points system
        this.particlePositions = new Float32Array(this.maxParticles * 3);
        this.particleColors = new Float32Array(this.maxParticles * 3);
        this.particleSizes = new Float32Array(this.maxParticles);
        this.particleIndex = 0;

        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.particlePositions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.particleColors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.particleSizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.3,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.8,
            sizeAttenuation: true
        });

        this.particleSystem = new THREE.Points(this.particleGeometry, particleMaterial);
        this.scene.add(this.particleSystem);

        this.resize();
    }

    add3DGrid() {
        // Floor grid (TIME x SPECTRAL CENTROID)
        const gridMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.4
        });

        // Create floor grid
        const gridSize = 15;
        const gridDivisions = 10;

        // Lines along X (time)
        for (let i = 0; i <= gridDivisions; i++) {
            const z = (i / gridDivisions) * gridSize;
            const geom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, z),
                new THREE.Vector3(gridSize, 0, z)
            ]);
            this.scene.add(new THREE.Line(geom, gridMaterial));
        }

        // Lines along Z (spectral centroid)
        for (let i = 0; i <= gridDivisions; i++) {
            const x = (i / gridDivisions) * gridSize;
            const geom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(x, 0, 0),
                new THREE.Vector3(x, 0, gridSize)
            ]);
            this.scene.add(new THREE.Line(geom, gridMaterial));
        }

        // Vertical lines for Y axis (Tonality) at back wall
        const backWallMaterial = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3
        });

        // Back wall horizontal lines (dB scale)
        const dbLabels = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
        for (let i = 0; i < dbLabels.length; i++) {
            const y = (dbLabels[i] / 100) * 10;
            const geom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, y, 0),
                new THREE.Vector3(gridSize, y, 0)
            ]);
            this.scene.add(new THREE.Line(geom, backWallMaterial));
        }

        // Side wall (left) - vertical grid
        for (let i = 0; i <= gridDivisions; i++) {
            const z = (i / gridDivisions) * gridSize;
            const geom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, 0, z),
                new THREE.Vector3(0, 10, z)
            ]);
            this.scene.add(new THREE.Line(geom, backWallMaterial));
        }
    }

    addAxes() {
        const axisLength = 12;

        // X axis (Time) - White/Gray
        const xMat = new THREE.LineBasicMaterial({ color: 0x666666, opacity: 0.7, transparent: true });
        const xGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        this.scene.add(new THREE.Line(xGeom, xMat));

        // Y axis (Tonality) - White/Gray
        const yMat = new THREE.LineBasicMaterial({ color: 0x666666, opacity: 0.7, transparent: true });
        const yGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 10, 0)
        ]);
        this.scene.add(new THREE.Line(yGeom, yMat));

        // Z axis (Spectral Centroid) - White/Gray
        const zMat = new THREE.LineBasicMaterial({ color: 0x666666, opacity: 0.7, transparent: true });
        const zGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        this.scene.add(new THREE.Line(zGeom, zMat));

        // Add tick marks for Y axis (dB values)
        const tickMat = new THREE.LineBasicMaterial({ color: 0x888888 });
        const dbValues = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

        for (const db of dbValues) {
            const y = (db / 100) * 10;
            const tickGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.15, y, 0),
                new THREE.Vector3(0.15, y, 0)
            ]);
            this.scene.add(new THREE.Line(tickGeom, tickMat));
        }

        // Add tick marks for Z axis (kHz values)
        const kHzValues = [0, 2, 4, 6, 8, 10, 12];
        for (const kHz of kHzValues) {
            const z = (kHz / 15) * 12;
            const tickGeom = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.15, 0, z),
                new THREE.Vector3(0.15, 0, z)
            ]);
            this.scene.add(new THREE.Line(tickGeom, tickMat));
        }
    }

    resize() {
        const rect = this.container.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    /**
     * Add a new point
     */
    addPoint(centroid, tonality, amplitude) {
        const idx = this.pointIndex * 3;
        const particleIdx = this.particleIndex * 3;

        // Map values to 3D space
        // X: Time (rolling)
        // Y: Tonality (0-1 -> 0-10) representing dB scale
        // Z: Spectral Centroid (0-12000 Hz -> 0-12)
        const x = (this.time % 12);
        const y = tonality * 10;
        const z = (centroid / 12000) * 12;

        this.trailPositions[idx] = x;
        this.trailPositions[idx + 1] = y;
        this.trailPositions[idx + 2] = z;

        // Color based on cepstral peak (amplitude as proxy)
        // Blue -> Magenta -> Yellow gradient
        const color = new THREE.Color();
        const peak = Math.min(1, amplitude * 2);

        if (peak < 0.5) {
            // Blue to Magenta
            color.setHSL(0.75 - peak * 0.25, 0.9, 0.5 + peak * 0.2);
        } else {
            // Magenta to Yellow
            const t = (peak - 0.5) * 2;
            color.setHSL(0.5 - t * 0.35, 0.9, 0.6 + t * 0.2);
        }

        this.trailColors[idx] = color.r;
        this.trailColors[idx + 1] = color.g;
        this.trailColors[idx + 2] = color.b;

        // Update current marker
        this.currentMarker.position.set(x, y, z);
        this.markerGlow.position.set(x, y, z);

        // Add particle at this location
        this.particlePositions[particleIdx] = x;
        this.particlePositions[particleIdx + 1] = y;
        this.particlePositions[particleIdx + 2] = z;
        this.particleColors[particleIdx] = color.r;
        this.particleColors[particleIdx + 1] = color.g;
        this.particleColors[particleIdx + 2] = color.b;
        this.particleSizes[this.particleIndex] = 0.2 + amplitude * 0.4;

        // Increment
        this.pointIndex = (this.pointIndex + 1) % this.maxPoints;
        this.particleIndex = (this.particleIndex + 1) % this.maxParticles;
        this.time += 0.08;

        // Update draw range
        this.trailGeometry.setDrawRange(0, Math.min(this.pointIndex + 1, this.maxPoints));
        this.trailGeometry.attributes.position.needsUpdate = true;
        this.trailGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    clear() {
        this.trailPositions.fill(0);
        this.trailColors.fill(0);
        this.particlePositions.fill(0);
        this.particleColors.fill(0);
        this.particleSizes.fill(0);
        this.pointIndex = 0;
        this.particleIndex = 0;
        this.time = 0;

        this.trailGeometry.attributes.position.needsUpdate = true;
        this.trailGeometry.attributes.color.needsUpdate = true;
        this.trailGeometry.setDrawRange(0, 0);
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
    }
}
