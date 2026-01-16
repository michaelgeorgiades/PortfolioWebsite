const { ipcRenderer } = require('electron');
const path = require('path');
const os = require('os');

// DOM Elements
const screenPreview = document.getElementById('screenPreview');
const webcamPreview = document.getElementById('webcamPreview');
const webcamOverlay = document.getElementById('webcamOverlay');
const noSource = document.getElementById('noSource');
const selectSourceBtn = document.getElementById('selectSourceBtn');
const sourceLabel = document.getElementById('sourceLabel');
const sourceModal = document.getElementById('sourceModal');
const modalClose = document.getElementById('modalClose');
const sourcesGrid = document.getElementById('sourcesGrid');
const recordBtn = document.getElementById('recordBtn');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');
const webcamToggle = document.getElementById('webcamToggle');
const webcamSelect = document.getElementById('webcamSelect');
const webcamOptions = document.getElementById('webcamOptions');
const webcamSize = document.getElementById('webcamSize');
const systemAudioToggle = document.getElementById('systemAudioToggle');
const micToggle = document.getElementById('micToggle');
const micSelect = document.getElementById('micSelect');
const micOptions = document.getElementById('micOptions');
const micLevel = document.getElementById('micLevel');
const qualitySelect = document.getElementById('qualitySelect');
const openFolderBtn = document.getElementById('openFolderBtn');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toastMessage');

// Webcam adjustment controls
const webcamZoomSlider = document.getElementById('webcamZoom');
const webcamOffsetXSlider = document.getElementById('webcamOffsetX');
const webcamOffsetYSlider = document.getElementById('webcamOffsetY');
const zoomValueDisplay = document.getElementById('zoomValue');
const offsetXValueDisplay = document.getElementById('offsetXValue');
const offsetYValueDisplay = document.getElementById('offsetYValue');
const resetFramingBtn = document.getElementById('resetFramingBtn');

// State
let screenStream = null;
let webcamStream = null;
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;
let selectedSource = null;
let audioContext = null;
let micAnalyser = null;
let animationFrameId = null;
let recordingAudioContext = null; // For mixing audio during recording

// Webcam video adjustment settings
let webcamZoom = 1.0;
let webcamOffsetX = 0;
let webcamOffsetY = 0;
let isWebcamFullscreen = false;

// Recording video elements (for live source switching)
let recordingScreenVideo = null;
let recordingWebcamVideo = null;

// Recording audio nodes (for live mic switching)
let recordingAudioDestination = null;
let recordingMicSource = null;

// Quality presets - including 4K
const qualityPresets = {
  '4k': { width: 3840, height: 2160, frameRate: 60, videoBitsPerSecond: 40000000, label: '4K (2160p 60fps)' },
  '2k': { width: 2560, height: 1440, frameRate: 60, videoBitsPerSecond: 16000000, label: '2K (1440p 60fps)' },
  'high': { width: 1920, height: 1080, frameRate: 60, videoBitsPerSecond: 8000000, label: 'Full HD (1080p 60fps)' },
  'medium': { width: 1280, height: 720, frameRate: 30, videoBitsPerSecond: 4000000, label: 'HD (720p 30fps)' },
  'low': { width: 854, height: 480, frameRate: 30, videoBitsPerSecond: 2000000, label: 'SD (480p 30fps)' }
};

// Window controls
document.getElementById('minimizeBtn').addEventListener('click', () => {
  ipcRenderer.send('minimize-window');
});

document.getElementById('maximizeBtn').addEventListener('click', () => {
  ipcRenderer.send('maximize-window');
});

document.getElementById('closeBtn').addEventListener('click', () => {
  ipcRenderer.send('close-window');
});

// Initialize
async function init() {
  console.log('Initializing Streamer...');

  // Populate quality options
  populateQualityOptions();

  // Setup event listeners first
  setupEventListeners();

  // Request permissions and load devices
  await requestPermissions();
  await loadDevices();

  console.log('Initialization complete');
}

// Populate quality dropdown based on screen resolution
async function populateQualityOptions() {
  try {
    const display = await ipcRenderer.invoke('get-primary-display');
    const maxHeight = display.height * display.scaleFactor;

    qualitySelect.innerHTML = '';

    // Add options based on what the display supports
    Object.entries(qualityPresets).forEach(([key, preset]) => {
      if (preset.height <= maxHeight || key === 'low' || key === 'medium') {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset.label;
        if (key === 'high') option.selected = true;
        qualitySelect.appendChild(option);
      }
    });
  } catch (err) {
    console.error('Error getting display info:', err);
    // Fallback - add all options
    Object.entries(qualityPresets).forEach(([key, preset]) => {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = preset.label;
      if (key === 'high') option.selected = true;
      qualitySelect.appendChild(option);
    });
  }
}

// Request media permissions
async function requestPermissions() {
  try {
    // Request camera and microphone access to trigger permission prompt
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });

    // Stop the stream immediately - we just needed the permission
    stream.getTracks().forEach(track => track.stop());

    console.log('Permissions granted');
    return true;
  } catch (err) {
    console.error('Permission error:', err);

    if (err.name === 'NotAllowedError') {
      showToast('Please allow camera and microphone access', 'error');
    } else if (err.name === 'NotFoundError') {
      console.log('No camera/mic found, continuing without them');
    }

    return false;
  }
}

// Load available devices
async function loadDevices() {
  console.log('Loading devices...');

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('Found devices:', devices);

    // Populate webcam select
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    webcamSelect.innerHTML = '';

    if (videoDevices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No cameras found';
      webcamSelect.appendChild(option);
    } else {
      videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`;
        webcamSelect.appendChild(option);
      });
    }

    // Populate microphone select
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    micSelect.innerHTML = '';

    if (audioDevices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No microphones found';
      micSelect.appendChild(option);
    } else {
      audioDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${index + 1}`;
        micSelect.appendChild(option);
      });
    }

    console.log(`Found ${videoDevices.length} cameras and ${audioDevices.length} microphones`);

  } catch (err) {
    console.error('Error loading devices:', err);
    showToast('Error loading devices: ' + err.message, 'error');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Source selection
  selectSourceBtn.addEventListener('click', openSourceModal);
  modalClose.addEventListener('click', closeSourceModal);
  sourceModal.addEventListener('click', (e) => {
    if (e.target === sourceModal) closeSourceModal();
  });

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      loadSources(btn.dataset.tab);
    });
  });

  // Webcam toggle
  webcamToggle.addEventListener('change', toggleWebcam);
  webcamSelect.addEventListener('change', updateWebcam);

  // Webcam position
  document.querySelectorAll('.pos-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.pos-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateWebcamPosition(btn.dataset.position);
    });
  });

  // Webcam size
  webcamSize.addEventListener('input', updateWebcamSize);

  // Webcam shape
  document.querySelectorAll('.shape-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.shape-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateWebcamShape(btn.dataset.shape);
    });
  });

  // Audio toggles
  micToggle.addEventListener('change', toggleMic);
  micSelect.addEventListener('change', updateMic);

  // Webcam framing adjustments
  if (webcamZoomSlider) {
    webcamZoomSlider.addEventListener('input', updateWebcamFraming);
  }
  if (webcamOffsetXSlider) {
    webcamOffsetXSlider.addEventListener('input', updateWebcamFraming);
  }
  if (webcamOffsetYSlider) {
    webcamOffsetYSlider.addEventListener('input', updateWebcamFraming);
  }
  if (resetFramingBtn) {
    resetFramingBtn.addEventListener('click', resetWebcamFraming);
  }

  // Record button
  recordBtn.addEventListener('click', toggleRecording);

  // Open folder button
  openFolderBtn.addEventListener('click', openRecordingsFolder);

  // Refresh devices button (via keyboard shortcut)
  document.addEventListener('keydown', async (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      showToast('Refreshing devices...', 'info');
      await loadDevices();
    }
    // Toggle webcam fullscreen with 'F' key
    if (e.key === 'f' || e.key === 'F') {
      // Don't trigger if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      toggleWebcamFullscreen();
    }
  });

  // Webcam fullscreen toggle button
  const webcamFullscreenBtn = document.getElementById('webcamFullscreenBtn');
  if (webcamFullscreenBtn) {
    webcamFullscreenBtn.addEventListener('click', toggleWebcamFullscreen);
  }
}

// Open source selection modal
async function openSourceModal() {
  sourceModal.classList.add('active');
  await loadSources('screen');
}

// Close source selection modal
function closeSourceModal() {
  sourceModal.classList.remove('active');
}

// Load available sources
async function loadSources(type) {
  sourcesGrid.innerHTML = '<div class="loading-sources">Loading sources...</div>';

  try {
    console.log('Loading sources of type:', type);
    const sources = await ipcRenderer.invoke('get-sources');
    console.log('Got sources:', sources);

    // Filter based on type
    let filteredSources;
    if (type === 'screens' || type === 'screen') {
      filteredSources = sources.filter(source =>
        source.id.startsWith('screen:') ||
        source.name.toLowerCase().includes('screen') ||
        source.name.toLowerCase().includes('display') ||
        source.name.toLowerCase().includes('entire screen')
      );

      // If no screen sources found with filter, get all screen type sources
      if (filteredSources.length === 0) {
        filteredSources = sources.filter(source => source.id.startsWith('screen:'));
      }

      // Still none? Show all sources
      if (filteredSources.length === 0) {
        filteredSources = sources;
      }
    } else {
      filteredSources = sources.filter(source =>
        source.id.startsWith('window:') &&
        !source.name.toLowerCase().includes('screen')
      );
    }

    sourcesGrid.innerHTML = '';

    if (filteredSources.length === 0) {
      sourcesGrid.innerHTML = '<div class="no-sources">No sources found. Try switching tabs.</div>';
      return;
    }

    filteredSources.forEach(source => {
      const item = document.createElement('div');
      item.className = 'source-item';
      if (selectedSource && selectedSource.id === source.id) {
        item.classList.add('selected');
      }

      const thumbnailSrc = source.thumbnail || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect fill="%23333" width="320" height="180"/></svg>';

      item.innerHTML = `
        <img src="${thumbnailSrc}" class="source-thumbnail" alt="${source.name}">
        <div class="source-name" title="${source.name}">${source.name}</div>
      `;
      item.addEventListener('click', () => selectSource(source));
      sourcesGrid.appendChild(item);
    });

    console.log(`Displayed ${filteredSources.length} sources`);

  } catch (err) {
    console.error('Error loading sources:', err);
    sourcesGrid.innerHTML = `<div class="error-sources">Error loading sources: ${err.message}</div>`;
  }
}

// Select a source
async function selectSource(source) {
  console.log('Selecting source:', source);
  selectedSource = source;
  sourceLabel.textContent = source.name.length > 20 ? source.name.substring(0, 20) + '...' : source.name;
  closeSourceModal();

  try {
    const quality = qualityPresets[qualitySelect.value] || qualityPresets.high;

    // Stop existing stream
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    // Get screen stream with system audio
    const constraints = {
      audio: systemAudioToggle.checked ? {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id
        }
      } : false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: source.id
        }
      }
    };

    console.log('Getting user media with constraints:', constraints);
    screenStream = await navigator.mediaDevices.getUserMedia(constraints);

    screenPreview.srcObject = screenStream;
    noSource.classList.add('hidden');

    // Update recording video element if recording is in progress
    if (isRecording && recordingScreenVideo) {
      recordingScreenVideo.srcObject = screenStream;
      await recordingScreenVideo.play();
    }

    showToast('Source selected: ' + source.name, 'success');

  } catch (err) {
    console.error('Error selecting source:', err);
    showToast('Could not capture source: ' + err.message, 'error');
  }
}

// Toggle webcam
async function toggleWebcam() {
  if (webcamToggle.checked) {
    await startWebcam();
  } else {
    stopWebcam();
    webcamOverlay.classList.remove('active');
  }
}

// Start webcam
async function startWebcam() {
  try {
    const deviceId = webcamSelect.value;
    if (!deviceId) {
      showToast('Please select a camera', 'error');
      webcamToggle.checked = false;
      return;
    }

    console.log('Starting webcam with device:', deviceId);

    if (webcamStream) {
      webcamStream.getTracks().forEach(track => track.stop());
    }

    webcamStream = await navigator.mediaDevices.getUserMedia({
      video: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      },
      audio: false
    });

    webcamPreview.srcObject = webcamStream;
    webcamOverlay.classList.add('active');

    // Update recording webcam element if recording is in progress
    if (isRecording) {
      if (!recordingWebcamVideo) {
        recordingWebcamVideo = document.createElement('video');
        recordingWebcamVideo.muted = true;
      }
      recordingWebcamVideo.srcObject = webcamStream;
      await recordingWebcamVideo.play();
    }

    showToast('Webcam started', 'success');

  } catch (err) {
    console.error('Error starting webcam:', err);
    showToast('Could not start webcam: ' + err.message, 'error');
    webcamToggle.checked = false;
  }
}

// Stop webcam
function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach(track => track.stop());
    webcamStream = null;
    webcamPreview.srcObject = null;
  }
  // Clear recording webcam element
  if (recordingWebcamVideo) {
    recordingWebcamVideo.srcObject = null;
    recordingWebcamVideo = null;
  }
  // Exit fullscreen mode when webcam is stopped
  if (isWebcamFullscreen) {
    isWebcamFullscreen = false;
    webcamOverlay.classList.remove('fullscreen');
    const webcamFullscreenBtn = document.getElementById('webcamFullscreenBtn');
    if (webcamFullscreenBtn) {
      webcamFullscreenBtn.classList.remove('active');
    }
  }
}

// Update webcam when device changes
async function updateWebcam() {
  if (webcamToggle.checked) {
    await startWebcam();
  }
}

// Update webcam position
function updateWebcamPosition(position) {
  webcamOverlay.classList.remove('top-left', 'top-right', 'bottom-left', 'bottom-right');
  webcamOverlay.classList.add(position);
}

// Update webcam size
function updateWebcamSize() {
  const size = webcamSize.value;
  webcamOverlay.style.width = `${size}px`;
  webcamOverlay.style.height = `${size}px`;
}

// Update webcam shape
function updateWebcamShape(shape) {
  if (shape === 'square') {
    webcamOverlay.classList.add('square');
  } else {
    webcamOverlay.classList.remove('square');
  }
}

// Toggle webcam fullscreen mode
function toggleWebcamFullscreen() {
  // Only toggle if webcam is active
  if (!webcamToggle.checked || !webcamStream) {
    showToast('Enable webcam first to use fullscreen', 'info');
    return;
  }

  isWebcamFullscreen = !isWebcamFullscreen;

  if (isWebcamFullscreen) {
    webcamOverlay.classList.add('fullscreen');
    showToast('Webcam fullscreen (Press F to exit)', 'info');
  } else {
    webcamOverlay.classList.remove('fullscreen');
    showToast('Webcam normal view', 'info');
  }

  // Update button icon if exists
  const webcamFullscreenBtn = document.getElementById('webcamFullscreenBtn');
  if (webcamFullscreenBtn) {
    webcamFullscreenBtn.classList.toggle('active', isWebcamFullscreen);
  }
}

// Update webcam framing (zoom and offset) using CSS transforms
function updateWebcamFraming() {
  webcamZoom = webcamZoomSlider ? parseInt(webcamZoomSlider.value) / 100 : 1.0;
  webcamOffsetX = webcamOffsetXSlider ? parseInt(webcamOffsetXSlider.value) : 0;
  webcamOffsetY = webcamOffsetYSlider ? parseInt(webcamOffsetYSlider.value) : 0;

  // Update display values
  if (zoomValueDisplay) {
    zoomValueDisplay.textContent = `${webcamZoom.toFixed(1)}x`;
  }
  if (offsetXValueDisplay) {
    offsetXValueDisplay.textContent = webcamOffsetX;
  }
  if (offsetYValueDisplay) {
    offsetYValueDisplay.textContent = webcamOffsetY;
  }

  // Apply CSS transform to webcam video for preview
  if (webcamPreview) {
    webcamPreview.style.transform = `scaleX(-1) scale(${webcamZoom}) translate(${webcamOffsetX}%, ${-webcamOffsetY}%)`;
  }
}

// Reset webcam framing to defaults
function resetWebcamFraming() {
  if (webcamZoomSlider) webcamZoomSlider.value = 100;
  if (webcamOffsetXSlider) webcamOffsetXSlider.value = 0;
  if (webcamOffsetYSlider) webcamOffsetYSlider.value = 0;

  webcamZoom = 1.0;
  webcamOffsetX = 0;
  webcamOffsetY = 0;

  if (zoomValueDisplay) zoomValueDisplay.textContent = '1.0x';
  if (offsetXValueDisplay) offsetXValueDisplay.textContent = '0';
  if (offsetYValueDisplay) offsetYValueDisplay.textContent = '0';

  // Reset CSS transform
  if (webcamPreview) {
    webcamPreview.style.transform = 'scale(1) translate(0%, 0%)';
  }
}

// Toggle microphone
async function toggleMic() {
  if (micToggle.checked) {
    await startMic();
  } else {
    stopMic();
  }
}

// Start microphone
async function startMic() {
  try {
    const deviceId = micSelect.value;
    if (!deviceId) {
      showToast('Please select a microphone', 'error');
      micToggle.checked = false;
      return;
    }

    console.log('Starting microphone with device:', deviceId);

    if (micStream) {
      micStream.getTracks().forEach(track => track.stop());
    }

    micStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: deviceId ? { exact: deviceId } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: false
    });

    // Setup audio analyser for level meter
    setupAudioAnalyser(micStream);

    // Update recording audio mixer if recording is in progress
    if (isRecording && recordingAudioContext && recordingAudioDestination) {
      // Disconnect old mic source if exists
      if (recordingMicSource) {
        try {
          recordingMicSource.disconnect();
        } catch (e) {
          // Source may already be disconnected
        }
      }
      // Connect new mic to recording mixer
      recordingMicSource = recordingAudioContext.createMediaStreamSource(
        new MediaStream(micStream.getAudioTracks())
      );
      recordingMicSource.connect(recordingAudioDestination);
      console.log('Microphone reconnected to recording mixer');
    }

    showToast('Microphone started', 'success');

  } catch (err) {
    console.error('Error starting microphone:', err);
    showToast('Could not start microphone: ' + err.message, 'error');
    micToggle.checked = false;
  }
}

// Stop microphone
function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach(track => track.stop());
    micStream = null;
  }
  // Disconnect from recording mixer if recording
  if (recordingMicSource) {
    try {
      recordingMicSource.disconnect();
    } catch (e) {
      // Source may already be disconnected
    }
    recordingMicSource = null;
  }
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  micLevel.style.width = '0%';
}

// Update microphone when device changes
async function updateMic() {
  if (micToggle.checked) {
    await startMic();
  }
}

// Setup audio analyser for level meter
function setupAudioAnalyser(stream) {
  if (audioContext) {
    audioContext.close();
  }

  audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(stream);
  micAnalyser = audioContext.createAnalyser();
  micAnalyser.fftSize = 256;
  source.connect(micAnalyser);

  updateMicLevel();
}

// Update microphone level meter
function updateMicLevel() {
  if (!micAnalyser || !micToggle.checked) {
    micLevel.style.width = '0%';
    return;
  }

  const dataArray = new Uint8Array(micAnalyser.frequencyBinCount);
  micAnalyser.getByteFrequencyData(dataArray);

  const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
  const level = Math.min(100, (average / 128) * 100);
  micLevel.style.width = `${level}%`;

  animationFrameId = requestAnimationFrame(updateMicLevel);
}

// Toggle recording
async function toggleRecording() {
  if (isRecording) {
    stopRecording();
  } else {
    await startRecording();
  }
}

// Start recording
async function startRecording() {
  if (!screenStream) {
    showToast('Please select a screen source first', 'error');
    return;
  }

  try {
    const quality = qualityPresets[qualitySelect.value] || qualityPresets.high;
    console.log('Starting recording with quality:', quality);

    // Create a canvas to composite streams
    const canvas = document.createElement('canvas');
    canvas.width = quality.width;
    canvas.height = quality.height;
    const ctx = canvas.getContext('2d');

    // Create video elements for compositing (stored globally for live source switching)
    recordingScreenVideo = document.createElement('video');
    recordingScreenVideo.srcObject = screenStream;
    recordingScreenVideo.muted = true;
    await recordingScreenVideo.play();

    recordingWebcamVideo = null;
    if (webcamToggle.checked && webcamStream) {
      recordingWebcamVideo = document.createElement('video');
      recordingWebcamVideo.srcObject = webcamStream;
      recordingWebcamVideo.muted = true;
      await recordingWebcamVideo.play();
    }

    // Get webcam settings
    const webcamSizeVal = parseInt(webcamSize.value);
    const activePositionBtn = document.querySelector('.pos-btn.active');
    const position = activePositionBtn ? activePositionBtn.dataset.position : 'bottom-left';
    const activeShapeBtn = document.querySelector('.shape-btn.active');
    const shape = activeShapeBtn ? activeShapeBtn.dataset.shape : 'circle';

    // Calculate webcam position on canvas (scaled to output resolution)
    const scaleFactor = quality.width / 1920; // Base scale on 1080p
    const scaledWebcamSize = Math.round(webcamSizeVal * scaleFactor);
    const padding = Math.round(20 * scaleFactor);

    let webcamX, webcamY;
    switch (position) {
      case 'top-left':
        webcamX = padding;
        webcamY = padding;
        break;
      case 'top-right':
        webcamX = canvas.width - scaledWebcamSize - padding;
        webcamY = padding;
        break;
      case 'bottom-left':
        webcamX = padding;
        webcamY = canvas.height - scaledWebcamSize - padding;
        break;
      case 'bottom-right':
      default:
        webcamX = canvas.width - scaledWebcamSize - padding;
        webcamY = canvas.height - scaledWebcamSize - padding;
        break;
    }

    isRecording = true;

    // Draw loop
    function drawFrame() {
      if (!isRecording) return;

      // Clear and fill with black
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Check if webcam is in fullscreen mode
      if (isWebcamFullscreen && recordingWebcamVideo && webcamToggle.checked) {
        // Draw webcam filling entire canvas (fullscreen mode)
        const webcamSource = recordingWebcamVideo;
        const videoWidth = webcamSource.videoWidth || webcamSource.width;
        const videoHeight = webcamSource.videoHeight || webcamSource.height;

        // Calculate source rectangle with zoom and offset
        const videoAspect = videoWidth / videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let srcX, srcY, srcWidth, srcHeight;

        if (videoAspect > canvasAspect) {
          // Video is wider - crop sides to fit canvas height
          srcHeight = videoHeight / webcamZoom;
          srcWidth = srcHeight * canvasAspect;
          srcX = (videoWidth - srcWidth) / 2 + (webcamOffsetX / 100) * srcWidth;
          srcY = (videoHeight - srcHeight) / 2 + (webcamOffsetY / 100) * srcHeight;
        } else {
          // Video is taller - crop top/bottom to fit canvas width
          srcWidth = videoWidth / webcamZoom;
          srcHeight = srcWidth / canvasAspect;
          srcX = (videoWidth - srcWidth) / 2 + (webcamOffsetX / 100) * srcWidth;
          srcY = (videoHeight - srcHeight) / 2 + (webcamOffsetY / 100) * srcHeight;
        }

        // Clamp source coordinates
        srcX = Math.max(0, Math.min(srcX, videoWidth - srcWidth));
        srcY = Math.max(0, Math.min(srcY, videoHeight - srcHeight));

        // Draw webcam fullscreen (mirrored)
        ctx.save();
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(webcamSource, srcX, srcY, srcWidth, srcHeight, 0, 0, canvas.width, canvas.height);
        ctx.restore();

      } else {
        // Normal mode: Draw screen with webcam overlay

        // Draw screen (maintain aspect ratio)
        const screenAspect = recordingScreenVideo.videoWidth / recordingScreenVideo.videoHeight;
        const canvasAspect = canvas.width / canvas.height;

        let drawWidth, drawHeight, drawX, drawY;

        if (screenAspect > canvasAspect) {
          drawWidth = canvas.width;
          drawHeight = canvas.width / screenAspect;
          drawX = 0;
          drawY = (canvas.height - drawHeight) / 2;
        } else {
          drawHeight = canvas.height;
          drawWidth = canvas.height * screenAspect;
          drawX = (canvas.width - drawWidth) / 2;
          drawY = 0;
        }

        // Draw screen
        ctx.drawImage(recordingScreenVideo, drawX, drawY, drawWidth, drawHeight);

        // Draw webcam overlay (small bubble in corner)
        if (recordingWebcamVideo && webcamToggle.checked) {
        ctx.save();

        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(
            webcamX + scaledWebcamSize / 2,
            webcamY + scaledWebcamSize / 2,
            scaledWebcamSize / 2,
            0,
            Math.PI * 2
          );
          ctx.clip();
        } else {
          ctx.beginPath();
          const radius = 12 * scaleFactor;
          ctx.roundRect(webcamX, webcamY, scaledWebcamSize, scaledWebcamSize, radius);
          ctx.clip();
        }

        // Use the webcam video directly
        const webcamSource = recordingWebcamVideo;

        // Calculate source rectangle to crop webcam video (cover mode)
        // This ensures the video fills the square without distortion
        const videoWidth = webcamSource.width || webcamSource.videoWidth;
        const videoHeight = webcamSource.height || webcamSource.videoHeight;
        const videoAspect = videoWidth / videoHeight;

        let srcX, srcY, srcWidth, srcHeight;

        if (videoAspect > 1) {
          // Video is wider than tall - crop sides
          srcHeight = videoHeight / webcamZoom;
          srcWidth = srcHeight; // Square crop
          srcX = (videoWidth - srcWidth) / 2 + (webcamOffsetX / 100) * srcWidth;
          srcY = (videoHeight - srcHeight) / 2 + (webcamOffsetY / 100) * srcHeight;
        } else {
          // Video is taller than wide - crop top/bottom
          srcWidth = videoWidth / webcamZoom;
          srcHeight = srcWidth; // Square crop
          srcX = (videoWidth - srcWidth) / 2 + (webcamOffsetX / 100) * srcWidth;
          srcY = (videoHeight - srcHeight) / 2 + (webcamOffsetY / 100) * srcHeight;
        }

        // Clamp source coordinates to valid range
        srcX = Math.max(0, Math.min(srcX, videoWidth - srcWidth));
        srcY = Math.max(0, Math.min(srcY, videoHeight - srcHeight));

        // Mirror the webcam horizontally and draw with proper cropping
        ctx.translate(webcamX + scaledWebcamSize, webcamY);
        ctx.scale(-1, 1);
        ctx.drawImage(webcamSource, srcX, srcY, srcWidth, srcHeight, 0, 0, scaledWebcamSize, scaledWebcamSize);

        ctx.restore();

        // Draw border
        ctx.save();
        ctx.strokeStyle = '#00d4ff';
        ctx.lineWidth = 3 * scaleFactor;

        if (shape === 'circle') {
          ctx.beginPath();
          ctx.arc(
            webcamX + scaledWebcamSize / 2,
            webcamY + scaledWebcamSize / 2,
            scaledWebcamSize / 2,
            0,
            Math.PI * 2
          );
          ctx.stroke();
        } else {
          ctx.beginPath();
          ctx.roundRect(webcamX, webcamY, scaledWebcamSize, scaledWebcamSize, 12 * scaleFactor);
          ctx.stroke();
        }
        ctx.restore();
        }
      }

      requestAnimationFrame(drawFrame);
    }

    // Start drawing
    drawFrame();

    // Get canvas stream
    const canvasStream = canvas.captureStream(quality.frameRate);

    // Create audio context for mixing audio streams
    let mixedAudioStream = null;

    const hasSystemAudio = systemAudioToggle.checked && screenStream.getAudioTracks().length > 0;
    const hasMicAudio = micToggle.checked && micStream && micStream.getAudioTracks().length > 0;

    console.log('Audio sources - System:', hasSystemAudio, 'Mic:', hasMicAudio);

    if (hasSystemAudio || hasMicAudio) {
      try {
        recordingAudioContext = new AudioContext();
        recordingAudioDestination = recordingAudioContext.createMediaStreamDestination();

        // Connect system audio if available
        if (hasSystemAudio) {
          const systemAudioSource = recordingAudioContext.createMediaStreamSource(
            new MediaStream(screenStream.getAudioTracks())
          );
          systemAudioSource.connect(recordingAudioDestination);
          console.log('System audio connected to mixer');
        }

        // Connect microphone audio if available
        if (hasMicAudio) {
          recordingMicSource = recordingAudioContext.createMediaStreamSource(
            new MediaStream(micStream.getAudioTracks())
          );
          recordingMicSource.connect(recordingAudioDestination);
          console.log('Microphone audio connected to mixer');
        }

        mixedAudioStream = recordingAudioDestination.stream;
        console.log('Audio mixing active, tracks:', mixedAudioStream.getAudioTracks().length);
      } catch (audioErr) {
        console.error('Error setting up audio mixing:', audioErr);
        showToast('Audio mixing error, recording without audio', 'error');
      }
    }

    // Create combined stream with video and mixed audio
    const streamTracks = [...canvasStream.getVideoTracks()];
    if (mixedAudioStream && mixedAudioStream.getAudioTracks().length > 0) {
      streamTracks.push(...mixedAudioStream.getAudioTracks());
    }

    const combinedStream = new MediaStream(streamTracks);
    console.log('Combined stream - Video tracks:', combinedStream.getVideoTracks().length, 'Audio tracks:', combinedStream.getAudioTracks().length);

    // Setup MediaRecorder with appropriate codec
    let mimeType = 'video/webm;codecs=vp9,opus';

    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm;codecs=vp8,opus';
    }
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
    }

    console.log('Using mimeType:', mimeType);

    const options = {
      mimeType: mimeType,
      videoBitsPerSecond: quality.videoBitsPerSecond
    };

    mediaRecorder = new MediaRecorder(combinedStream, options);
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        recordedChunks.push(e.data);
      }
    };

    mediaRecorder.onstop = async () => {
      console.log('Recording stopped, saving...');
      const blob = new Blob(recordedChunks, { type: mimeType });
      const buffer = await blob.arrayBuffer();
      const tempFilename = `recording-${formatDate(new Date())}.temp.webm`;

      try {
        // Save temp WebM file
        const tempPath = await ipcRenderer.invoke('auto-save-recording', buffer, tempFilename);
        if (tempPath) {
          // Show conversion modal
          showConversionModal();

          // Transcode to MP4
          const mp4Path = await ipcRenderer.invoke('transcode-to-mp4', tempPath);

          // Hide modal and show success
          hideConversionModal();
          const mp4Filename = path.basename(mp4Path);
          showToast(`Saved: ${mp4Filename}`, 'success');
        }
      } catch (err) {
        console.error('Error saving/converting recording:', err);
        hideConversionModal();
        showToast('Error converting recording', 'error');
      }
    };

    mediaRecorder.onerror = (e) => {
      console.error('MediaRecorder error:', e);
      showToast('Recording error occurred', 'error');
      stopRecording();
    };

    mediaRecorder.start(1000);

    // Update UI
    recordBtn.classList.add('recording');
    recordBtn.querySelector('span').textContent = 'Stop Recording';
    recordingIndicator.classList.add('active');

    // Start timer
    recordingStartTime = Date.now();
    updateRecordingTime();
    recordingTimer = setInterval(updateRecordingTime, 1000);

    showToast('Recording started', 'success');

  } catch (err) {
    console.error('Error starting recording:', err);
    showToast('Could not start recording: ' + err.message, 'error');
    isRecording = false;
  }
}

// Stop recording
function stopRecording() {
  console.log('Stopping recording...');
  isRecording = false;

  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }

  // Close recording audio context and clean up audio nodes
  if (recordingMicSource) {
    try {
      recordingMicSource.disconnect();
    } catch (e) {}
    recordingMicSource = null;
  }
  recordingAudioDestination = null;
  if (recordingAudioContext) {
    recordingAudioContext.close();
    recordingAudioContext = null;
    console.log('Recording audio context closed');
  }

  // Clean up recording video elements
  if (recordingScreenVideo) {
    recordingScreenVideo.srcObject = null;
    recordingScreenVideo = null;
  }
  if (recordingWebcamVideo) {
    recordingWebcamVideo.srcObject = null;
    recordingWebcamVideo = null;
  }

  // Update UI
  recordBtn.classList.remove('recording');
  recordBtn.querySelector('span').textContent = 'Start Recording';
  recordingIndicator.classList.remove('active');

  // Stop timer
  if (recordingTimer) {
    clearInterval(recordingTimer);
    recordingTimer = null;
  }
  recordingTime.textContent = '00:00:00';
}

// Update recording time display
function updateRecordingTime() {
  const elapsed = Date.now() - recordingStartTime;
  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  recordingTime.textContent =
    `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

// Format date for filename
function formatDate(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
}

// Open recordings folder
async function openRecordingsFolder() {
  try {
    const folderPath = await ipcRenderer.invoke('get-videos-path');
    await ipcRenderer.invoke('open-folder', folderPath);
  } catch (err) {
    console.error('Error opening folder:', err);
    // Fallback
    const folderPath = path.join(os.homedir(), 'Videos', 'Streamer');
    await ipcRenderer.invoke('open-folder', folderPath);
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  console.log(`Toast [${type}]: ${message}`);
  toastMessage.textContent = message;
  toast.className = 'toast show';
  if (type) {
    toast.classList.add(type);
  }

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

// Conversion modal functions
function showConversionModal() {
  const modal = document.getElementById('conversionModal');
  const progressBar = document.getElementById('conversionProgress');
  const progressText = document.getElementById('conversionText');
  if (modal) {
    modal.classList.add('show');
    progressBar.style.width = '0%';
    progressText.textContent = 'Starting conversion...';
  }
}

function hideConversionModal() {
  const modal = document.getElementById('conversionModal');
  if (modal) {
    modal.classList.remove('show');
  }
}

function updateConversionProgress(percent) {
  const progressBar = document.getElementById('conversionProgress');
  const progressText = document.getElementById('conversionText');
  if (progressBar && progressText) {
    progressBar.style.width = `${percent}%`;
    progressText.textContent = `Converting to MP4... ${percent}%`;
  }
}

// Listen for transcoding progress updates
ipcRenderer.on('transcode-progress', (event, percent) => {
  updateConversionProgress(percent);
});

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', init);

// Also try immediate init in case DOMContentLoaded already fired
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init();
}
