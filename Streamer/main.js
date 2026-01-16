const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, systemPreferences, session } = require('electron');
const path = require('path');
const fs = require('fs');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

// Set ffmpeg path for fluent-ffmpeg
ffmpeg.setFfmpegPath(ffmpegPath.replace('app.asar', 'app.asar.unpacked'));

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    transparent: false,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true,
      webSecurity: true
    },
    icon: path.join(__dirname, 'assets/icon.png')
  });

  // Set permissions for media access
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'mediaKeySystem', 'geolocation', 'notifications', 'fullscreen', 'pointerLock'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
  });

  // Allow all media permissions
  session.defaultSession.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    return true;
  });

  mainWindow.loadFile('index.html');

  // Uncomment for debugging
  // mainWindow.webContents.openDevTools();
}

// Handle app ready
app.whenReady().then(async () => {
  // Request media access on macOS (doesn't hurt on Windows)
  if (process.platform === 'darwin') {
    try {
      await systemPreferences.askForMediaAccess('camera');
      await systemPreferences.askForMediaAccess('microphone');
    } catch (e) {
      console.log('Media access request:', e);
    }
  }

  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Get available screen sources
ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      displayId: source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

// Get source by type
ipcMain.handle('get-sources-by-type', async (event, type) => {
  try {
    const sources = await desktopCapturer.getSources({
      types: [type],
      thumbnailSize: { width: 320, height: 180 },
      fetchWindowIcons: true
    });

    return sources.map(source => ({
      id: source.id,
      name: source.name,
      thumbnail: source.thumbnail.toDataURL(),
      displayId: source.display_id,
      appIcon: source.appIcon ? source.appIcon.toDataURL() : null
    }));
  } catch (error) {
    console.error('Error getting sources:', error);
    return [];
  }
});

// Save recording file with dialog
ipcMain.handle('save-recording', async (event, buffer) => {
  const { filePath } = await dialog.showSaveDialog({
    title: 'Save Recording',
    defaultPath: `recording-${Date.now()}.webm`,
    filters: [
      { name: 'WebM Video', extensions: ['webm'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (filePath) {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return filePath;
  }
  return null;
});

// Auto-save recording to default location
ipcMain.handle('auto-save-recording', async (event, buffer, filename) => {
  const videosPath = app.getPath('videos');
  const streamerPath = path.join(videosPath, 'Streamer');

  if (!fs.existsSync(streamerPath)) {
    fs.mkdirSync(streamerPath, { recursive: true });
  }

  const filePath = path.join(streamerPath, filename);
  fs.writeFileSync(filePath, Buffer.from(buffer));
  return filePath;
});

// Get videos path
ipcMain.handle('get-videos-path', () => {
  const videosPath = app.getPath('videos');
  return path.join(videosPath, 'Streamer');
});

// Window controls
ipcMain.on('minimize-window', () => {
  mainWindow.minimize();
});

ipcMain.on('maximize-window', () => {
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('close-window', () => {
  mainWindow.close();
});

// Open folder in explorer
ipcMain.handle('open-folder', async (event, folderPath) => {
  const { shell } = require('electron');

  // Create folder if it doesn't exist
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  shell.openPath(folderPath);
});

// Get screen resolution
ipcMain.handle('get-primary-display', () => {
  const { screen } = require('electron');
  const primaryDisplay = screen.getPrimaryDisplay();
  return {
    width: primaryDisplay.size.width,
    height: primaryDisplay.size.height,
    scaleFactor: primaryDisplay.scaleFactor
  };
});

// Transcode WebM to MP4 with H.264/AAC
ipcMain.handle('transcode-to-mp4', async (event, inputPath) => {
  return new Promise((resolve, reject) => {
    const outputPath = inputPath.replace('.temp.webm', '.mp4');
    let duration = 0;

    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (!err && metadata && metadata.format && metadata.format.duration) {
        duration = parseFloat(metadata.format.duration);
      }

      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-crf 23',           // Excellent quality (lower = better, but slower)
          '-preset fast',      // Fast encoding with good quality
          '-profile:v high',   // Best H.264 features
          '-pix_fmt yuv420p',  // Maximum compatibility
          '-b:a 256k',         // High quality AAC audio
          '-movflags +faststart' // Enable streaming/fast start
        ])
        .on('progress', (progress) => {
          let percent = 0;

          // Try using percent directly if available
          if (progress.percent && progress.percent > 0) {
            percent = Math.min(99, Math.round(progress.percent));
          }
          // Fallback to timemark calculation
          else if (progress.timemark && duration > 0) {
            const timeParts = progress.timemark.split(':');
            if (timeParts.length >= 3) {
              const currentTime = parseFloat(timeParts[0]) * 3600 + parseFloat(timeParts[1]) * 60 + parseFloat(timeParts[2]);
              percent = Math.min(99, Math.round((currentTime / duration) * 100));
            }
          }

          // Send progress to renderer
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('transcode-progress', percent);
          }
        })
        .on('end', () => {
          // Send 100% before completing
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('transcode-progress', 100);
          }
          // Delete temp WebM file
          try {
            fs.unlinkSync(inputPath);
          } catch (e) {
            console.error('Could not delete temp file:', e);
          }
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('Transcoding error:', err);
          reject(err);
        })
        .save(outputPath);
    });
  });
});
