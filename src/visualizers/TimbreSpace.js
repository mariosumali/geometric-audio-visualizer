/**
 * TimbreSpace - Spread vs Centroid vs Entropy 3D scatter
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class TimbreSpace {
    constructor(container) {
        this.container = container;

        // Three.js setup
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            alpha: true
        });

        // Point data
        this.maxPoints = 800;
        this.positions = new Float32Array(this.maxPoints * 3);
        this.colors = new Float32Array(this.maxPoints * 3);
        this.sizes = new Float32Array(this.maxPoints);
        this.pointIndex = 0;

        this.init();
    }

    init() {
        // Renderer setup
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setClearColor(0x001008, 0.3);
        this.container.appendChild(this.renderer.domElement);

        // Camera position
        this.camera.position.set(12, 10, 12);
        this.camera.lookAt(0, 0, 0);

        // Controls
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.autoRotate = true;
        this.controls.autoRotateSpeed = -0.3;

        // Create particles
        this.particleGeometry = new THREE.BufferGeometry();
        this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
        this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
        this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

        const particleMaterial = new THREE.PointsMaterial({
            size: 0.25,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            opacity: 0.7,
            sizeAttenuation: true
        });

        this.particles = new THREE.Points(this.particleGeometry, particleMaterial);
        this.scene.add(this.particles);

        // Add axes
        this.addAxes();

        // Add bounding box
        this.addBoundingBox();

        this.resize();
    }

    addAxes() {
        const axisLength = 8;

        // X axis (Spectral Centroid) - Red
        const xMat = new THREE.LineBasicMaterial({ color: 0xFF4444, opacity: 0.6, transparent: true });
        const xGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(axisLength, 0, 0)
        ]);
        this.scene.add(new THREE.Line(xGeom, xMat));

        // Y axis (Spectral Spread) - Green
        const yMat = new THREE.LineBasicMaterial({ color: 0x44FF44, opacity: 0.6, transparent: true });
        const yGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, axisLength, 0)
        ]);
        this.scene.add(new THREE.Line(yGeom, yMat));

        // Z axis (Spectral Entropy) - Blue
        const zMat = new THREE.LineBasicMaterial({ color: 0x4444FF, opacity: 0.6, transparent: true });
        const zGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0),
            new THREE.Vector3(0, 0, axisLength)
        ]);
        this.scene.add(new THREE.Line(zGeom, zMat));

        // Add tick marks
        const tickMat = new THREE.LineBasicMaterial({ color: 0x333333 });

        for (let i = 1; i <= 8; i++) {
            // X ticks
            const xTick = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(i, -0.1, 0),
                new THREE.Vector3(i, 0.1, 0)
            ]);
            this.scene.add(new THREE.Line(xTick, tickMat));

            // Y ticks
            const yTick = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(-0.1, i, 0),
                new THREE.Vector3(0.1, i, 0)
            ]);
            this.scene.add(new THREE.Line(yTick, tickMat));

            // Z ticks
            const zTick = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(0, -0.1, i),
                new THREE.Vector3(0, 0.1, i)
            ]);
            this.scene.add(new THREE.Line(zTick, tickMat));
        }
    }

    addBoundingBox() {
        const boxGeometry = new THREE.BoxGeometry(8, 8, 8);
        const edges = new THREE.EdgesGeometry(boxGeometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x333333,
            transparent: true,
            opacity: 0.3
        });
        const box = new THREE.LineSegments(edges, lineMaterial);
        box.position.set(4, 4, 4);
        this.scene.add(box);
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
    addPoint(centroid, spread, entropy, amplitude) {
        const idx = this.pointIndex * 3;

        // Map values to 3D space (0-8 range)
        // X: Spectral Centroid (0-8000 Hz -> 0-8)
        // Y: Spectral Spread (0-4000 Hz -> 0-8)
        // Z: Spectral Entropy (0-1 -> 0-8)
        const x = (centroid / 8000) * 8;
        const y = (spread / 4000) * 8;
        const z = entropy * 8;

        this.positions[idx] = x;
        this.positions[idx + 1] = y;
        this.positions[idx + 2] = z;

        // Color based on combined features
        const color = new THREE.Color();
        const hue = (x / 8) * 0.3 + (y / 8) * 0.3 + (z / 8) * 0.3;
        color.setHSL(hue, 0.8, 0.5 + amplitude * 0.3);

        this.colors[idx] = color.r;
        this.colors[idx + 1] = color.g;
        this.colors[idx + 2] = color.b;

        // Size based on amplitude
        this.sizes[this.pointIndex] = 0.5 + amplitude * 1.5;

        // Increment
        this.pointIndex = (this.pointIndex + 1) % this.maxPoints;

        // Mark for update
        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
    }

    render() {
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }

    clear() {
        this.positions.fill(0);
        this.colors.fill(0);
        this.sizes.fill(0);
        this.pointIndex = 0;

        this.particleGeometry.attributes.position.needsUpdate = true;
        this.particleGeometry.attributes.color.needsUpdate = true;
        this.particleGeometry.attributes.size.needsUpdate = true;
    }
}
