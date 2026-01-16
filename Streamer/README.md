# Streamer - Screen Recorder

A professional screen recording application with webcam overlay, available in both **Desktop** and **Browser** versions.

## 🎯 Choose Your Version

### 🖥️ Desktop App (Recommended)
**Best for: Regular use, highest quality recordings, smaller file sizes**

**Features:**
- ✅ Native Windows application
- ✅ Automatic MP4 conversion (H.264)
- ✅ Faster encoding with FFmpeg
- ✅ Smaller file sizes
- ✅ Save to Videos folder automatically

**Files:**
```
index.html          - Main UI
main.js            - Electron main process
renderer.js        - Application logic
styles.css         - Styling
package.json       - Dependencies
```

**Setup & Run:**
```bash
npm install
npm start
```

See [SETUP.md](SETUP.md) for detailed instructions.

---

### 🌐 Browser App
**Best for: Quick recording without installation, cross-platform**

**Features:**
- ✅ No installation required
- ✅ Works in any modern browser
- ✅ Completely offline
- ✅ Save as WebM format
- ✅ Portable and shareable

**Files:**
```
browser/
├── index.html     - Main UI
├── recorder.js    - Application logic
├── styles.css     - Styling
└── README.md      - Browser-specific docs
```

**How to Use:**
1. Open `browser/index.html` in Chrome, Edge, or Firefox
2. Or run a local server:
   ```bash
   python -m http.server 8000
   # Then open http://localhost:8000/browser/
   ```

See [browser/README.md](browser/README.md) for detailed instructions.

---

## 📊 Comparison

| Feature | Desktop App | Browser App |
|---------|-------------|-------------|
| **Installation** | Required (npm install) | None |
| **Platform** | Windows/Mac/Linux | Any browser |
| **File Format** | MP4 (H.264) | WebM (VP9) |
| **File Size** | Smaller | Larger |
| **Conversion** | Automatic | Manual (optional) |
| **Performance** | Faster | Good |
| **Screen Capture** | Electron API | Browser API |
| **Quality** | Excellent | Excellent |
| **Offline** | Yes | Yes |

---

## 🎥 Common Features (Both Versions)

- ✅ **Screen Recording** - Capture entire screen, windows, or tabs
- ✅ **Webcam Overlay** - Picture-in-picture with customization
  - Adjustable position (4 corners)
  - Adjustable size (100-400px)
  - Circle or square shape
  - Zoom and pan controls
  - Fullscreen mode (press F)
- ✅ **Audio Mixing**
  - System/desktop audio
  - Microphone input
  - Mix both sources
  - Live microphone level meter
- ✅ **Quality Options**
  - Full HD (1080p 60fps)
  - HD (720p 30fps)
  - SD (480p 30fps)
- ✅ **Live Preview** - See exactly what will be recorded
- ✅ **Recording Timer** - Track recording duration

---

## 🚀 Quick Start

### Desktop App:
```bash
npm install
npm start
```

### Browser App:
Just open `browser/index.html` in your browser!

---

## 📁 Project Structure

```
Streamer/
├── browser/              # Browser version
│   ├── index.html       # Browser app UI
│   ├── recorder.js      # Browser logic
│   ├── styles.css       # Browser styles
│   └── README.md        # Browser docs
├── assets/              # Icons and images
├── scripts/             # Build scripts
├── index.html           # Desktop app UI
├── main.js             # Desktop Electron process
├── renderer.js         # Desktop app logic
├── styles.css          # Desktop app styles
├── package.json        # Desktop dependencies
├── SETUP.md            # Desktop setup guide
└── README.md           # This file
```

---

## 🔧 Building Desktop App

```bash
# Build for Windows
npm run build

# Build portable exe
npm run build:exe

# Build MSI installer
npm run build:msi
```

---

## 🌟 Tips

### Desktop App:
- Install once, use anytime
- Recordings auto-save to Videos/Streamer
- MP4 files are smaller and more compatible

### Browser App:
- No installation needed
- Share the folder - it works anywhere
- Convert WebM to MP4 if needed (see browser/README.md)
- Chrome/Edge work best for screen recording

---

## 📝 License

MIT License

---

## 🐛 Troubleshooting

### Desktop App Issues
- Make sure Node.js is installed
- Run `npm install` before starting
- Check SETUP.md for detailed instructions

### Browser App Issues
- Grant camera/microphone permissions
- Use Chrome or Edge for best compatibility
- Enable "Share tab audio" for system audio
- Check browser/README.md for more help

---

**Choose the version that fits your needs and start recording!** 🎬
