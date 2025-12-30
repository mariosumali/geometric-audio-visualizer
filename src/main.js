/**
 * Geometric Audio Visualizer - Main Entry Point
 */
import './style.css';

import { AudioEngine } from './audio/AudioEngine.js';
import { AudioAnalyzer } from './audio/AudioAnalyzer.js';
import { ToneMap } from './visualizers/ToneMap.js';
import { PitchMap } from './visualizers/PitchMap.js';
import { VocalSignature } from './visualizers/VocalSignature.js';
import { Manifold3D } from './visualizers/Manifold3D.js';
import { ToneEvolution } from './visualizers/ToneEvolution.js';
import { TimbreSpace } from './visualizers/TimbreSpace.js';

class App {
  constructor() {
    // Core audio
    this.audioEngine = new AudioEngine();
    this.analyzer = new AudioAnalyzer(this.audioEngine);

    // Visualizers
    this.visualizers = {};

    // State
    this.isPlaying = false;
    this.animationId = null;
    this.lastRenderTime = 0;
    this.frameInterval = 1000 / 60; // 60 FPS

    // Throttle for data point additions
    this.lastDataTime = 0;
    this.dataInterval = 50; // Add data every 50ms

    this.init();
  }

  init() {
    this.initDOMElements();
    this.initEventListeners();
    this.initVisualizers();
    this.initResize();

    // Handle window resize
    window.addEventListener('resize', () => this.handleResize());
  }

  initDOMElements() {
    // Upload elements
    this.uploadSection = document.getElementById('upload-section');
    this.dropzone = document.getElementById('dropzone');
    this.fileInput = document.getElementById('file-input');
    this.browseBtn = document.getElementById('browse-btn');

    // Visualizer elements
    this.visualizerSection = document.getElementById('visualizer');
    this.newFileBtn = document.getElementById('new-file-btn');
    this.videoContainer = document.getElementById('video-container');

    // Playback controls
    this.playBtn = document.getElementById('play-btn');
    this.playIcon = this.playBtn.querySelector('.play-icon');
    this.pauseIcon = this.playBtn.querySelector('.pause-icon');
    this.progressContainer = document.getElementById('progress-container');
    this.progressFill = document.getElementById('progress-fill');
    this.currentTimeDisplay = document.getElementById('current-time');
    this.durationDisplay = document.getElementById('duration');

    // Canvas elements
    this.toneMapCanvas = document.getElementById('tone-map-canvas');
    this.pitchMapCanvas = document.getElementById('pitch-map-canvas');
    this.vocalSignatureCanvas = document.getElementById('vocal-signature-canvas');
    this.manifoldContainer = document.getElementById('manifold-container');
    this.toneEvolutionContainer = document.getElementById('tone-evolution-container');
    this.timbreSpaceContainer = document.getElementById('timbre-space-container');

    // MFCC Sidebar elements
    this.mfccBars = [];
    for (let i = 1; i <= 13; i++) {
      this.mfccBars.push(document.getElementById(`mfcc-${i}`));
    }
    this.emissionFill = document.getElementById('emission-fill');
    this.ttFrequency = document.getElementById('tt-frequency');
    this.ttAmplitude = document.getElementById('tt-amplitude');
  }

  initEventListeners() {
    // Drag and drop
    this.dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      this.dropzone.classList.add('dragover');
    });

    this.dropzone.addEventListener('dragleave', () => {
      this.dropzone.classList.remove('dragover');
    });

    this.dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      this.dropzone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) this.loadFile(file);
    });

    // Click to browse
    this.dropzone.addEventListener('click', () => this.fileInput.click());
    this.browseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.fileInput.click();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) this.loadFile(file);
    });

    // New file button
    this.newFileBtn.addEventListener('click', () => this.showUploadSection());

    // Playback controls
    this.playBtn.addEventListener('click', () => this.togglePlayback());

    // Progress bar seek
    this.progressContainer.addEventListener('click', (e) => {
      const rect = this.progressContainer.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * this.audioEngine.duration;
      this.audioEngine.seek(time);
    });

    // Keyboard controls
    document.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !this.uploadSection.classList.contains('hidden')) {
        // Prevent page scroll
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        this.togglePlayback();
      }
    });
  }

  initVisualizers() {
    // 2D visualizers
    this.visualizers.toneMap = new ToneMap(this.toneMapCanvas);
    this.visualizers.pitchMap = new PitchMap(this.pitchMapCanvas);
    this.visualizers.vocalSignature = new VocalSignature(this.vocalSignatureCanvas);

    // 3D visualizers
    this.visualizers.manifold = new Manifold3D(this.manifoldContainer);
    this.visualizers.toneEvolution = new ToneEvolution(this.toneEvolutionContainer);
    this.visualizers.timbreSpace = new TimbreSpace(this.timbreSpaceContainer);
  }

  async loadFile(file) {
    try {
      const mediaElement = await this.audioEngine.loadFile(file);

      // Handle video
      if (file.type.startsWith('video/')) {
        this.videoContainer.innerHTML = '';
        this.videoContainer.appendChild(mediaElement);
        this.videoContainer.classList.remove('hidden');
        mediaElement.muted = true; // Mute video element since audio comes from AudioContext
      } else {
        this.videoContainer.classList.add('hidden');
      }

      // Update UI
      this.durationDisplay.textContent = this.formatTime(this.audioEngine.duration);

      // Show visualizer
      this.showVisualizerSection();

      // Start playback
      await this.audioEngine.play();
      this.isPlaying = true;
      this.updatePlayButton();

      // Clear previous data
      this.clearVisualizers();

      // Start animation loop
      this.startAnimation();

    } catch (error) {
      console.error('Error loading file:', error);
      alert('Error loading file. Please try a different file.');
    }
  }

  showVisualizerSection() {
    this.uploadSection.classList.add('hidden');
    this.visualizerSection.classList.remove('hidden');

    // Wait for layout, then resize
    requestAnimationFrame(() => {
      this.handleResize();
    });
  }

  showUploadSection() {
    this.stopAnimation();
    this.audioEngine.pause();
    this.isPlaying = false;

    this.visualizerSection.classList.add('hidden');
    this.uploadSection.classList.remove('hidden');
    this.videoContainer.classList.add('hidden');

    this.fileInput.value = '';
  }

  togglePlayback() {
    if (this.isPlaying) {
      this.audioEngine.pause();
      this.isPlaying = false;
    } else {
      this.audioEngine.play();
      this.isPlaying = true;
    }
    this.updatePlayButton();
  }

  updatePlayButton() {
    if (this.isPlaying) {
      this.playIcon.classList.add('hidden');
      this.pauseIcon.classList.remove('hidden');
    } else {
      this.playIcon.classList.remove('hidden');
      this.pauseIcon.classList.add('hidden');
    }
  }

  startAnimation() {
    const animate = (timestamp) => {
      this.animationId = requestAnimationFrame(animate);

      // Throttle rendering
      if (timestamp - this.lastRenderTime < this.frameInterval) {
        return;
      }
      this.lastRenderTime = timestamp;

      // Update progress
      this.updateProgress();

      // Get audio features
      if (this.isPlaying) {
        this.updateVisualizers(timestamp);
      }

      // Render all visualizers
      this.render();
    };

    this.animationId = requestAnimationFrame(animate);
  }

  stopAnimation() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  updateProgress() {
    const currentTime = this.audioEngine.getCurrentTime();
    const duration = this.audioEngine.duration;

    if (duration > 0) {
      const percent = (currentTime / duration) * 100;
      this.progressFill.style.width = `${percent}%`;
      this.currentTimeDisplay.textContent = this.formatTime(currentTime);
    }
  }

  updateVisualizers(timestamp) {
    // Get all features
    const features = this.analyzer.getAllFeatures();

    // Always update real-time visualizers
    this.visualizers.vocalSignature.update(features);

    // Update MFCC Sidebar
    this.updateMFCCSidebar(features);

    // Throttle data point additions
    if (timestamp - this.lastDataTime >= this.dataInterval) {
      this.lastDataTime = timestamp;

      // Add data points
      this.visualizers.toneMap.addPoint(
        features.spectralCentroid,
        features.rms,
        features.spectralFlux
      );

      this.visualizers.pitchMap.addData(
        features.spectralCentroid,
        features.pitch
      );

      this.visualizers.manifold.addParticle(
        features.mfccs,
        features.spectralCentroid,
        features.spectralSpread,
        features.rms
      );

      this.visualizers.toneEvolution.addPoint(
        features.spectralCentroid,
        features.tonality,
        features.rms
      );

      this.visualizers.timbreSpace.addPoint(
        features.spectralCentroid,
        features.spectralSpread,
        features.spectralEntropy,
        features.rms
      );
    }
  }

  updateMFCCSidebar(features) {
    // Update MFCC bars
    if (features.mfccs && this.mfccBars) {
      for (let i = 0; i < Math.min(13, features.mfccs.length); i++) {
        if (this.mfccBars[i]) {
          // Normalize MFCC values (typically range from -40 to 40)
          const normalized = Math.min(1, Math.max(0, (features.mfccs[i] + 40) / 80));
          this.mfccBars[i].style.transform = `scaleX(${normalized})`;
        }
      }
    }

    // Update emission fill (time progress)
    if (this.emissionFill && this.audioEngine) {
      const percent = (this.audioEngine.getCurrentTime() / this.audioEngine.duration) * 100;
      this.emissionFill.style.width = `${percent}%`;
    }

    // Update tooltip values
    if (this.ttFrequency) {
      this.ttFrequency.textContent = (features.spectralCentroid / 1000).toFixed(4);
    }
    if (this.ttAmplitude) {
      // Convert RMS to dB
      const db = features.rms > 0 ? 20 * Math.log10(features.rms) : -92.5;
      this.ttAmplitude.textContent = `${db.toFixed(1)} dB`;
    }
  }

  render() {
    // 2D visualizers
    this.visualizers.toneMap.render();
    this.visualizers.pitchMap.render();
    this.visualizers.vocalSignature.render();

    // 3D visualizers
    this.visualizers.manifold.render();
    this.visualizers.toneEvolution.render();
    this.visualizers.timbreSpace.render();
  }

  clearVisualizers() {
    Object.values(this.visualizers).forEach(v => v.clear && v.clear());
  }

  handleResize() {
    // Resize 2D canvases
    this.visualizers.toneMap.resize();
    this.visualizers.pitchMap.resize();
    this.visualizers.vocalSignature.resize();

    // Resize 3D renderers
    this.visualizers.manifold.resize();
    this.visualizers.toneEvolution.resize();
    this.visualizers.timbreSpace.resize();
  }

  initResize() {
    const leftColumn = document.getElementById('left-column');
    const columnResize = document.getElementById('column-resize');
    const panelGrid = document.getElementById('panel-grid');

    // Column width resize
    if (columnResize && leftColumn) {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      columnResize.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = leftColumn.offsetWidth;
        document.body.classList.add('resizing');
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const delta = e.clientX - startX;
        const newWidth = Math.min(Math.max(startWidth + delta, 200), window.innerWidth * 0.5);
        leftColumn.style.width = `${newWidth}px`;
        leftColumn.style.flex = 'none';
        // Update grid
        if (panelGrid) {
          panelGrid.style.gridTemplateColumns = `${newWidth}px 1fr`;
        }
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.classList.remove('resizing');
          this.handleResize();
        }
      });
    }

    // Panel height resize within left column
    const leftPanels = leftColumn?.querySelectorAll('.panel.resizable');
    if (leftPanels) {
      leftPanels.forEach((panel) => {
        const handle = panel.querySelector('.resize-handle.resize-bottom');
        if (!handle) return;

        let isResizing = false;
        let startY = 0;
        let startHeight = 0;

        handle.addEventListener('mousedown', (e) => {
          isResizing = true;
          startY = e.clientY;
          startHeight = panel.offsetHeight;
          document.body.classList.add('resizing');
          e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
          if (!isResizing) return;
          const delta = e.clientY - startY;
          const newHeight = Math.max(startHeight + delta, 80);
          panel.style.height = `${newHeight}px`;
          panel.style.flex = 'none';
        });

        document.addEventListener('mouseup', () => {
          if (isResizing) {
            isResizing = false;
            document.body.classList.remove('resizing');
            this.handleResize();
          }
        });
      });
    }

    // Bottom row panel width resize
    const bottomRow = document.querySelector('.bottom-row');
    const toneEvolutionPanel = document.getElementById('tone-evolution-panel');
    const toneEvolutionHandle = toneEvolutionPanel?.querySelector('.resize-handle.resize-right');

    if (toneEvolutionHandle && bottomRow) {
      let isResizing = false;
      let startX = 0;
      let startWidth = 0;

      toneEvolutionHandle.addEventListener('mousedown', (e) => {
        isResizing = true;
        startX = e.clientX;
        startWidth = toneEvolutionPanel.offsetWidth;
        document.body.classList.add('resizing');
        e.preventDefault();
      });

      document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const delta = e.clientX - startX;
        const containerWidth = bottomRow.offsetWidth;
        const newWidth = Math.min(Math.max(startWidth + delta, 200), containerWidth - 200);
        const percent = (newWidth / containerWidth) * 100;
        bottomRow.style.gridTemplateColumns = `${percent}% 1fr`;
      });

      document.addEventListener('mouseup', () => {
        if (isResizing) {
          isResizing = false;
          document.body.classList.remove('resizing');
          this.handleResize();
        }
      });
    }
  }

  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});
