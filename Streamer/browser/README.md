# Streamer Browser - Web-Based Screen Recorder

A browser-based version of Streamer that runs directly in your web browser without any installation.

## ⚠️ Important: Permissions

When you first open the app, you'll be asked to grant **camera and microphone permissions**. This is required to:
- Populate the device lists with actual camera/microphone names
- Enable webcam and microphone features

You can deny these permissions if you only want to record your screen without webcam/mic.

## Features

✅ **Screen Recording** - Capture your entire screen, specific windows, or browser tabs
✅ **Webcam Overlay** - Add picture-in-picture webcam with customizable position, size, and shape
✅ **System Audio** - Record desktop/tab audio
✅ **Microphone** - Add commentary with your microphone
✅ **Audio Mixing** - Combine system audio and microphone
✅ **Quality Options** - Full HD, HD, or SD recording
✅ **Webcam Framing** - Zoom and pan your webcam video
✅ **Direct Download** - Save recordings as WebM files
✅ **No Installation** - Runs entirely in your browser

## How to Use

### Option 1: Open Directly
Simply open `browser.html` in a modern web browser (Chrome, Edge, or Firefox recommended).

### Option 2: Run with Local Server
For better compatibility, run a local server:

```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (npx)
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000/browser.html` in your browser.

## Quick Start Guide

1. **Select Screen** - Click "Select Screen" to choose what to record
2. **Enable Webcam** (optional) - Toggle webcam and configure position/size
3. **Enable Microphone** (optional) - Toggle mic for commentary
4. **Start Recording** - Click the red "Start Recording" button
5. **Stop Recording** - Click "Stop Recording" when done
6. **Download** - Click "Download Recording" to save your video

## Browser Compatibility

**Works Best In:**
- ✅ Google Chrome 94+
- ✅ Microsoft Edge 94+
- ✅ Firefox 90+
- ✅ Opera 80+

**Note:** Safari has limited support for screen recording APIs.

## Browser Permissions

The app will request permissions for:
- 🖥️ **Screen Capture** - Required to record your screen
- 📷 **Camera** - Only if you enable webcam
- 🎤 **Microphone** - Only if you enable mic

## Key Differences from Desktop Version

| Feature | Desktop App | Browser Version |
|---------|------------|-----------------|
| Installation | Required | None |
| File Format | MP4 (H.264) | WebM (VP9/VP8) |
| Conversion | Auto-converts to MP4 | Direct WebM download |
| File Size | Smaller (H.264) | Larger (WebM) |
| Quality | Excellent | Excellent |
| Performance | Better | Good |

## Converting WebM to MP4

To convert your WebM recordings to MP4 for better compatibility:

### Using Online Tools:
- [CloudConvert](https://cloudconvert.com/webm-to-mp4)
- [FreeConvert](https://www.freeconvert.com/webm-to-mp4)

### Using FFmpeg (Command Line):
```bash
ffmpeg -i recording.webm -c:v libx264 -crf 23 -preset fast -c:a aac output.mp4
```

## Keyboard Shortcuts

- **F5** - Refresh device list
- **F** - Toggle webcam fullscreen mode

## Tips for Best Results

1. **Use Chrome/Edge** - These browsers have the best screen recording support
2. **Close Unnecessary Tabs** - Reduces memory usage during recording
3. **Choose Quality Wisely** - Full HD produces large files
4. **System Audio** - Works best when recording a specific tab
5. **Stable Internet** - Not required, app works offline!

## Troubleshooting

### Screen sharing not working?
- Make sure you're using a supported browser
- Grant screen sharing permissions when prompted
- Try refreshing the page

### No audio in recording?
- Check "System Audio" toggle is enabled
- When selecting screen, choose "Share tab audio" in Chrome
- Verify microphone permissions if using mic

### Large file sizes?
- WebM files are larger than MP4
- Lower recording quality (choose HD or SD)
- Convert to MP4 after recording

### Webcam not showing?
- Grant camera permissions
- Check if webcam is being used by another app
- Try selecting a different camera from the dropdown

## Privacy & Security

- ✅ All processing happens locally in your browser
- ✅ No data is uploaded to any server
- ✅ No internet connection required
- ✅ Your recordings stay on your device

## Known Limitations

1. **No MP4 Export** - Browser version saves as WebM only
2. **Large Files** - WebM files are typically larger than MP4
3. **Safari Support** - Limited screen recording capabilities
4. **Mobile** - Not supported on mobile browsers

## Advanced: Self-Hosting

To host this on your own web server:

1. Upload all three files to your web server:
   - `browser.html`
   - `browser-styles.css`
   - `browser-recorder.js`

2. Ensure your server serves with HTTPS (required for screen capture)

3. Access via `https://yourdomain.com/browser.html`

## License

Same as the desktop version - MIT License

---

**Enjoy recording!** 🎥
