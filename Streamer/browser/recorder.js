// DOM Elements
const screenPreview = document.getElementById('screenPreview');
const webcamPreview = document.getElementById('webcamPreview');
const webcamOverlay = document.getElementById('webcamOverlay');
const noSource = document.getElementById('noSource');
const selectSourceBtn = document.getElementById('selectSourceBtn');
const sourceLabel = document.getElementById('sourceLabel');
const recordBtn = document.getElementById('recordBtn');
const downloadBtn = document.getElementById('downloadBtn');
const recordingIndicator = document.getElementById('recordingIndicator');
const recordingTime = document.getElementById('recordingTime');
const webcamToggle = document.getElementById('webcamToggle');
const webcamSelect = document.getElementById('webcamSelect');
const webcamSize = document.getElementById('webcamSize');
const systemAudioToggle = document.getElementById('systemAudioToggle');
const micToggle = document.getElementById('micToggle');
const micSelect = document.getElementById('micSelect');
const micLevel = document.getElementById('micLevel');
const qualitySelect = document.getElementById('qualitySelect');
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
const webcamFullscreenBtn = document.getElementById('webcamFullscreenBtn');

// State
let screenStream = null;
let webcamStream = null;
let micStream = null;
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let recordingStartTime = null;
let recordingTimer = null;
let audioContext = null;
let micAnalyser = null;
let animationFrameId = null;
let recordingAudioContext = null;
let recordedBlob = null;

// Webcam video adjustment settings
let webcamZoom = 1.0;
let webcamOffsetX = 0;
let webcamOffsetY = 0;
let isWebcamFullscreen = false;

// Recording video elements
let recordingScreenVideo = null;
let recordingWebcamVideo = null;

// Recording audio nodes
let recordingAudioDestination = null;
let recordingMicSource = null;

// Quality presets
const qualityPresets = {
  'high': { width: 1920, height: 1080, frameRate: 60, videoBitsPerSecond: 8000000, label: 'Full HD (1080p 60fps)' },
  'medium': { width: 1280, height: 720, frameRate: 30, videoBitsPerSecond: 4000000, label: 'HD (720p 30fps)' },
  'low': { width: 854, height: 480, frameRate: 30, videoBitsPerSecond: 2000000, label: 'SD (480p 30fps)' }
};

// Initialize
async function init() {
  console.log('Initializing Streamer Browser...');

  // Setup event listeners
  setupEventListeners();

  // Request permissions first to get device labels
  await requestPermissions();

  // Load devices after permissions
  await loadDevices();

  console.log('Initialization complete');
}

// Request media permissions
async function requestPermissions() {
  let cameraGranted = false;
  let micGranted = false;

  // Try to request camera permission
  try {
    console.log('Requesting camera permission...');
    const videoStream = await navigator.mediaDevices.getUserMedia({
      video: true
    });
    videoStream.getTracks().forEach(track => track.stop());
    cameraGranted = true;
    console.log('Camera permission granted');
  } catch (err) {
    console.warn('Camera permission error:', err);
    if (err.name === 'NotAllowedError') {
      showToast('Camera permission denied - webcam features disabled', 'info');
    } else if (err.name === 'NotFoundError') {
      console.log('No camera found');
    }
  }

  // Try to request microphone permission
  try {
    console.log('Requesting microphone permission...');
    const audioStream = await navigator.mediaDevices.getUserMedia({
      audio: true
    });
    audioStream.getTracks().forEach(track => track.stop());
    micGranted = true;
    console.log('Microphone permission granted');
  } catch (err) {
    console.warn('Microphone permission error:', err);
    if (err.name === 'NotAllowedError') {
      showToast('Microphone permission denied - mic features disabled', 'info');
    } else if (err.name === 'NotFoundError') {
      console.log('No microphone found');
    }
  }

  if (cameraGranted || micGranted) {
    console.log('Permissions result - Camera:', cameraGranted, 'Mic:', micGranted);
    return true;
  } else {
    showToast('Please grant camera/microphone permissions to use these features', 'info');
    return false;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Source selection
  selectSourceBtn.addEventListener('click', selectScreen);

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
  document.getElementById('sizeValue').textContent = webcamSize.value + 'px';
  webcamSize.addEventListener('input', () => {
    document.getElementById('sizeValue').textContent = webcamSize.value + 'px';
  });

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

  // Download button
  downloadBtn.addEventListener('click', downloadRecording);

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.key === 'F5') {
      e.preventDefault();
      showToast('Refreshing devices...', 'info');
      loadDevices();
    }
    if (e.key === 'f' || e.key === 'F') {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
      toggleWebcamFullscreen();
    }
  });

  // Webcam fullscreen toggle button
  if (webcamFullscreenBtn) {
    webcamFullscreenBtn.addEventListener('click', toggleWebcamFullscreen);
  }
}

// Load available devices
async function loadDevices() {
  console.log('Loading devices...');

  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    console.log('All devices:', devices.length);

    // Log each device for debugging
    devices.forEach((device, i) => {
      console.log(`Device ${i}:`, {
        kind: device.kind,
        label: device.label || '(no label)',
        deviceId: device.deviceId ? device.deviceId.substring(0, 20) + '...' : 'none'
      });
    });

    // Populate webcam select
    const videoDevices = devices.filter(d => d.kind === 'videoinput');
    console.log('Video devices found:', videoDevices.length);
    webcamSelect.innerHTML = '';

    if (videoDevices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No cameras found';
      webcamSelect.appendChild(option);
      console.warn('No video input devices detected');
    } else {
      videoDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Camera ${index + 1}`;
        webcamSelect.appendChild(option);
        console.log(`Added camera: ${option.textContent} (${device.deviceId.substring(0, 20)}...)`);
      });
    }

    // Populate microphone select
    const audioDevices = devices.filter(d => d.kind === 'audioinput');
    console.log('Audio devices found:', audioDevices.length);
    micSelect.innerHTML = '';

    if (audioDevices.length === 0) {
      const option = document.createElement('option');
      option.value = '';
      option.textContent = 'No microphones found';
      micSelect.appendChild(option);
      console.warn('No audio input devices detected');
    } else {
      audioDevices.forEach((device, index) => {
        const option = document.createElement('option');
        option.value = device.deviceId;
        option.textContent = device.label || `Microphone ${index + 1}`;
        micSelect.appendChild(option);
        console.log(`Added mic: ${option.textContent} (${device.deviceId.substring(0, 20)}...)`);
      });
    }

    console.log(`Device enumeration complete - Cameras: ${videoDevices.length}, Mics: ${audioDevices.length}`);

  } catch (err) {
    console.error('Error loading devices:', err);
    showToast('Error loading devices: ' + err.message, 'error');
  }
}

// Select screen for recording
async function selectScreen() {
  try {
    console.log('Requesting display media...');

    // Stop existing stream
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    // Request screen capture with audio
    const constraints = {
      video: {
        displaySurface: 'monitor', // Can be 'monitor', 'window', or 'browser'
      },
      audio: systemAudioToggle.checked
    };

    screenStream = await navigator.mediaDevices.getDisplayMedia(constraints);

    screenPreview.srcObject = screenStream;
    noSource.classList.add('hidden');

    // Update label with screen info
    const videoTrack = screenStream.getVideoTracks()[0];
    const label = videoTrack.label || 'Screen';
    sourceLabel.textContent = label.length > 20 ? label.substring(0, 20) + '...' : label;

    // Update recording video element if recording is in progress
    if (isRecording && recordingScreenVideo) {
      recordingScreenVideo.srcObject = screenStream;
      await recordingScreenVideo.play();
    }

    showToast('Screen selected: ' + label, 'success');

    // Listen for track end (user stopped sharing)
    screenStream.getVideoTracks()[0].addEventListener('ended', () => {
      console.log('Screen sharing stopped by user');
      if (isRecording) {
        stopRecording();
      }
      noSource.classList.remove('hidden');
      sourceLabel.textContent = 'Select Screen';
      showToast('Screen sharing stopped', 'info');
    });

  } catch (err) {
    console.error('Error selecting screen:', err);
    if (err.name === 'NotAllowedError') {
      showToast('Screen sharing permission denied', 'error');
    } else {
      showToast('Could not capture screen: ' + err.message, 'error');
    }
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
  if (recordingWebcamVideo) {
    recordingWebcamVideo.srcObject = null;
    recordingWebcamVideo = null;
  }
  if (isWebcamFullscreen) {
    isWebcamFullscreen = false;
    webcamOverlay.classList.remove('fullscreen');
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

  if (webcamFullscreenBtn) {
    webcamFullscreenBtn.classList.toggle('active', isWebcamFullscreen);
  }
}

// Update webcam framing
function updateWebcamFraming() {
  webcamZoom = webcamZoomSlider ? parseInt(webcamZoomSlider.value) / 100 : 1.0;
  webcamOffsetX = webcamOffsetXSlider ? parseInt(webcamOffsetXSlider.value) : 0;
  webcamOffsetY = webcamOffsetYSlider ? parseInt(webcamOffsetYSlider.value) : 0;

  if (zoomValueDisplay) {
    zoomValueDisplay.textContent = `${webcamZoom.toFixed(1)}x`;
  }
  if (offsetXValueDisplay) {
    offsetXValueDisplay.textContent = webcamOffsetX;
  }
  if (offsetYValueDisplay) {
    offsetYValueDisplay.textContent = webcamOffsetY;
  }

  if (webcamPreview) {
    webcamPreview.style.transform = `scaleX(-1) scale(${webcamZoom}) translate(${webcamOffsetX}%, ${-webcamOffsetY}%)`;
  }
}

// Reset webcam framing
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

  if (webcamPreview) {
    webcamPreview.style.transform = 'scaleX(-1) scale(1) translate(0%, 0%)';
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
      if (recordingMicSource) {
        try {
          recordingMicSource.disconnect();
        } catch (e) {
          // Source may already be disconnected
        }
      }
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

    // Create video elements for compositing
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
    const position = activePositionBtn ? activePositionBtn.dataset.position : 'bottom-right';
    const activeShapeBtn = document.querySelector('.shape-btn.active');
    const shape = activeShapeBtn ? activeShapeBtn.dataset.shape : 'circle';

    // Calculate webcam position on canvas
    const scaleFactor = quality.width / 1920;
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

        // Draw screen
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

        const webcamSource = recordingWebcamVideo;
        const videoWidth = webcamSource.videoWidth || webcamSource.width;
        const videoHeight = webcamSource.videoHeight || webcamSource.height;
        const videoAspect = videoWidth / videoHeight;

        let srcX, srcY, srcWidth, srcHeight;

        if (videoAspect > 1) {
          srcHeight = videoHeight / webcamZoom;
          srcWidth = srcHeight;
          srcX = (videoWidth - srcWidth) / 2 + (webcamOffsetX / 100) * srcWidth;
          srcY = (videoHeight - srcHeight) / 2 + (webcamOffsetY / 100) * srcHeight;
        } else {
          srcWidth = videoWidth / webcamZoom;
          srcHeight = srcWidth;
          srcX = (videoWidth - srcWidth) / 2 + (webcamOffsetX / 100) * srcWidth;
          srcY = (videoHeight - srcHeight) / 2 + (webcamOffsetY / 100) * srcHeight;
        }

        srcX = Math.max(0, Math.min(srcX, videoWidth - srcWidth));
        srcY = Math.max(0, Math.min(srcY, videoHeight - srcHeight));

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

        if (hasSystemAudio) {
          const systemAudioSource = recordingAudioContext.createMediaStreamSource(
            new MediaStream(screenStream.getAudioTracks())
          );
          systemAudioSource.connect(recordingAudioDestination);
          console.log('System audio connected to mixer');
        }

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

    // Create combined stream
    const streamTracks = [...canvasStream.getVideoTracks()];
    if (mixedAudioStream && mixedAudioStream.getAudioTracks().length > 0) {
      streamTracks.push(...mixedAudioStream.getAudioTracks());
    }

    const combinedStream = new MediaStream(streamTracks);
    console.log('Combined stream - Video:', combinedStream.getVideoTracks().length, 'Audio:', combinedStream.getAudioTracks().length);

    // Setup MediaRecorder
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
      console.log('Recording stopped, creating blob...');
      recordedBlob = new Blob(recordedChunks, { type: mimeType });

      // Show download button
      downloadBtn.style.display = 'flex';

      showToast('Recording saved! Click Download to save file.', 'success');
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

  // Close recording audio context
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

// Download recording
function downloadRecording() {
  if (!recordedBlob) {
    showToast('No recording to download', 'error');
    return;
  }

  const url = URL.createObjectURL(recordedBlob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = `recording-${formatDate(new Date())}.webm`;
  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 100);

  showToast('Recording downloaded!', 'success');
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
