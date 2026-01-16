# Streamer App - Setup Instructions

## After Restarting Your PC

Open a terminal (Command Prompt or PowerShell) and run these commands:

### Step 1: Clean Install Dependencies
```bash
cd C:\Users\me\Downloads\Projects\Streamer
rd /s /q node_modules
del package-lock.json
npm install
```

### Step 2: Test the App
```bash
npm start
```

This should open the Streamer app. Test that:
- Screen sources appear when you click "Choose Screen"
- Webcam dropdown shows your cameras
- Microphone dropdown shows your mics
- Press F5 to refresh devices if needed

### Step 3: Build the Windows Installer
```bash
npm run build
```

This creates two files in the `dist` folder:
- `Streamer Setup 1.0.0.exe` - Standard installer
- `Streamer-Portable-1.0.0.exe` - Portable version (no install needed)

---

## Troubleshooting

### If devices don't appear:
- Click the toggles for Webcam/Microphone - this triggers permission prompts
- Press F5 to refresh the device list
- Make sure no other app is using the camera/mic

### If screen capture fails:
- Run the app as Administrator
- Make sure screen recording is allowed in Windows Privacy Settings

### If build fails:
Try building just the portable version:
```bash
npm run build:exe
```

---

## Project Structure
```
Streamer/
├── main.js         - Electron main process
├── renderer.js     - Recording & UI logic
├── index.html      - App layout
├── styles.css      - Futuristic UI styles
├── package.json    - Build configuration
└── assets/         - App icons
```

## Quality Options Available
- 4K (2160p 60fps)
- 2K (1440p 60fps)
- Full HD (1080p 60fps)
- HD (720p 30fps)
- SD (480p 30fps)

Recordings save to: `Videos\Streamer\`
