/**
 * Manifold3D - Spatiotemporal Acoustic Manifold (3D MFCC visualization)
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { PCA } from '../utils/PCA.js';

export class Manifold3D {
    constructor(container) {
        this.container = container;
        this.pca = new PCA();

        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        // Particle system
        this.maxParticles = 2000;
        this.particleIndex = 0;
        this.positions = new Float32Array(this.maxParticles * 3);
        this.colors = new Float32Array(this.maxParticles * 3);
        this.sizes = new Float32Array(this.maxParticles);

        // Particle metadata for tooltips
        this.particleData = [];

        // Line connections
        this.linePositions = new Float32Array(this.maxParticles * 2 * 3);
        this.lineIndex = 0;

        // Raycaster for hover detection
        this.raycaster = new THREE.Raycaster();
        this.raycaster.params.Points.threshold = 0.5;
        this.mouse = new THREE.Vector2();
        this.hoveredParticle = null;

        // Tooltip elements
        this.tooltip = null;

        this.init();
    }

    init() {
        // Renderer setup
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x0a0000, 0.3);
        this.container.appendChild(this.renderer.domElement);

        // Camera position
        this.camera.position.set(20, 15, 20);
        this.camera.lookAt(0, 0, 0);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.rotateSpeed = 0.5;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = 0.3;

        // Create particle geometry
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        // Particle material with glow effect
        const particleMaterial = new THREE.PointsMaterial({
            size: 0.15,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.9,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(this.particleGeometry, particleMaterial);
        this.scene.add(this.particles);

        // Create line geometry for connections
        this.lineGeometry = new THREE.BufferGeometry();
        this.lineGeometry.setAttribute('position', new THREE.BufferAttribute(this.linePositions, 3));

        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.2,
            blending: THREE.AdditiveBlending
        });

        this.lines = new THREE.LineSegments(this.lineGeometry, lineMaterial);
        this.scene.add(this.lines);

        // Add axes helper
        this.addAxes();

        // Add ambient lighting effect
        this.addGlow();

        // Setup hover interaction
        this.setupHoverInteraction();

        // Get tooltip reference
        this.tooltip = document.getElementById('manifold-tooltip');

        // Initial resize
        this.resize();
    }

    setupHoverInteraction() {
        this.container.addEventListener('mousemove', (event) => {
            const rect = this.container.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.checkHover();
        });

        this.container.addEventListener('mouseleave', () => {
            this.hideTooltip();
        });
    }

    checkHover() {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObject(this.particles);

        if (intersects.length > 0) {
            const idx = intersects[0].index;
            if (idx < this.particleData.length && this.particleData[idx]) {
                this.showTooltip(this.particleData[idx]);
            }
        } else {
            this.hideTooltip();
        }
    }

    showTooltip(data) {
        if (!this.tooltip) return;

        // Update tooltip values
        const freqEl = document.getElementById('tt-frequency');
        const spreadEl = document.getElementById('tt-spread');
        const ampEl = document.getElementById('tt-amplitude');
        const emissionEl = document.getElementById('tt-emission');
        const centroidEl = document.getElementById('tt-centroid');

        if (freqEl) freqEl.textContent = (data.centroid / 1000).toFixed(4);
        if (spreadEl) spreadEl.textContent = data.spread.toFixed(2);
        if (ampEl) ampEl.textContent = data.amplitude.toFixed(2);
        if (emissionEl) emissionEl.textContent = data.time.toFixed(2);
        if (centroidEl) centroidEl.textContent = (data.centroid / 1000).toFixed(2) + 'k';

        this.tooltip.classList.remove('hidden');
        this.tooltip.classList.add('visible');
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.classList.add('hidden');
            this.tooltip.classList.remove('visible');
        }
    }

    addAxes() {
        const axisLength = 15;
        const axisColor = 0x444444;

        // Create axes
        const axesMaterial = new THREE.LineBasicMaterial({
            color: axisColor,
            transparent: true,
            opacity: 0.3
        });

        // X axis
        const xGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-axisLength, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        const xAxis = new THREE.Line(xGeom, axesMaterial);
        xAxis.userData.isAxis = true;
        this.scene.add(xAxis);

        // Y axis
        const yGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -axisLength, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        const yAxis = new THREE.Line(yGeom, axesMaterial);
        yAxis.userData.isAxis = true;
        this.scene.add(yAxis);

        // Z axis
        const zGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -axisLength),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        const zAxis = new THREE.Line(zGeom, axesMaterial);
        zAxis.userData.isAxis = true;
        this.scene.add(zAxis);

        // Grid on XZ plane
        const gridSize = 20;
        const gridDivisions = 20;
        const grid = new THREE.GridHelper(gridSize, gridDivisions, 0x222222, 0x111111);
        grid.position.y = -10;
        this.scene.add(grid);
    }

    addGlow() {
        // Central glow sphere
        const glowGeometry = new THREE.SphereGeometry(0.5, 16, 16);
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFF4400,
            transparent: true,
            opacity: 0.4
        });
        this.glowSphere = new THREE.Mesh(glowGeometry, glowMaterial);
        this.scene.add(this.glowSphere);

        // Outer glow ring
        const outerGlowGeometry = new THREE.SphereGeometry(1.0, 16, 16);
        const outerGlowMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFFFFF,
            transparent: true,
            opacity: 0.15
        });
        this.outerGlow = new THREE.Mesh(outerGlowGeometry, outerGlowMaterial);
        this.scene.add(this.outerGlow);
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
     * Add a new particle from MFCC data
     */
    addParticle(mfccs, centroid, spread = 0, amplitude = 0) {
        // Project MFCCs to 3D using PCA
        const coords = this.pca.transform(mfccs, 3);

        const idx = this.particleIndex * 3;
        const currentTime = this.particleData.length * 0.05;

        // Store particle metadata for tooltip
        this.particleData[this.particleIndex] = {
            centroid: centroid,
            spread: spread || centroid * 0.3,
            amplitude: amplitude || Math.random() * 0.5,
            time: currentTime,
            frequency: centroid
        };

        // Store previous position for line
        if (this.particleIndex > 0) {
            const prevIdx = ((this.particleIndex - 1) * 3);
            const lineIdx = this.lineIndex * 6;

            // Previous point
            this.linePositions[lineIdx] = this.positions[prevIdx];
            this.linePositions[lineIdx + 1] = this.positions[prevIdx + 1];
            this.linePositions[lineIdx + 2] = this.positions[prevIdx + 2];

            // Current point
            this.linePositions[lineIdx + 3] = coords[0];
            this.linePositions[lineIdx + 4] = coords[1];
            this.linePositions[lineIdx + 5] = coords[2];

            this.lineIndex = (this.lineIndex + 1) % (this.maxParticles - 1);
        }

        // Set position
        this.positions[idx] = coords[0];
        this.positions[idx + 1] = coords[1];
        this.positions[idx + 2] = coords[2];

        // Set color based on spectral centroid (rainbow spectrum matching legend)
        // 0 Hz = red/dark red, 15000 Hz = yellow/green
        const normalizedCentroid = Math.min(1, centroid / 15000);
        const color = new THREE.Color();

        // Map frequency to rainbow: low freq = red/purple, high freq = yellow/green
        if (normalizedCentroid < 0.5) {
            // Red -> Magenta -> Purple -> Blue
            const hue = (1 - normalizedCentroid * 2) * 0.1 + normalizedCentroid * 2 * 0.85;
            color.setHSL(hue, 0.9, 0.55);
        } else {
            // Blue -> Cyan -> Green -> Yellow
            const hue = 0.15 + (normalizedCentroid - 0.5) * 2 * 0.15;
            color.setHSL(hue, 0.9, 0.55);
        }

        this.colors[idx] = color.r;
        this.colors[idx + 1] = color.g;
        this.colors[idx + 2] = color.b;

        // Set size (larger for higher amplitude)
        const sizeMultiplier = this.particleData[this.particleIndex].amplitude || 0.5;
        this.sizes[this.particleIndex] = 0.8 + sizeMultiplier * 0.8;

        // Update draw range
        this.particleIndex = (this.particleIndex + 1) % this.maxParticles;

        // Mark attributes for update
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
        this.lineGeometry.attributes.position.needsUpdate = true;

        // Update glow position to centroid of recent particles
        this.updateGlow();
    }

    updateGlow() {
        // Average recent positions to find centroid
        let avgX = 0, avgY = 0, avgZ = 0;
        const sampleCount = Math.min(100, this.particleIndex);

        if (sampleCount === 0) return;

        for (let i = 0; i < sampleCount; i++) {
            const idx = ((this.particleIndex - 1 - i + this.maxParticles) % this.maxParticles) * 3;
            avgX += this.positions[idx];
            avgY += this.positions[idx + 1];
            avgZ += this.positions[idx + 2];
        }

        const centerX = avgX / sampleCount;
        const centerY = avgY / sampleCount;
        const centerZ = avgZ / sampleCount;

        // Update glow position to follow particle centroid
        this.glowSphere.position.set(centerX, centerY, centerZ);
        if (this.outerGlow) {
            this.outerGlow.position.set(centerX, centerY, centerZ);
        }
        // Camera rotates around origin (0,0,0)
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    clear() {
        this.positions.fill(0);
        this.colors.fill(0);
        this.sizes.fill(0);
        this.linePositions.fill(0);
        this.particleIndex = 0;
        this.lineIndex = 0;
        this.particleData = [];

        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
        this.lineGeometry.attributes.position.needsUpdate = true;
    }

    // Toggle methods for settings
    toggleGlow(visible) {
        if (this.glowSphere) this.glowSphere.visible = visible;
        if (this.outerGlow) this.outerGlow.visible = visible;
    }

    toggleLines(visible) {
        if (this.lines) this.lines.visible = visible;
    }

    toggleAutoRotate(enabled) {
        if (this.controls) this.controls.autoRotate = enabled;
    }

    toggleGrid(visible) {
        // Find grid in scene
        this.scene.children.forEach(child => {
            if (child.type === 'GridHelper') {
                child.visible = visible;
            }
        });
    }

    toggleAxes(visible) {
        this.scene.children.forEach(child => {
            if (child.type === 'Line' && child.userData && child.userData.isAxis) {
                child.visible = visible;
            }
        });
    }

    setParticleSize(size) {
        if (this.particles && this.particles.material) {
            this.particles.material.size = parseFloat(size);
            this.particles.material.needsUpdate = true;
        }
    }
}
