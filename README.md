# Vlog Electron

A seamless vlogging app built with Electron, TypeScript, and React that allows you to record your screen with high quality and manage your recordings.

## Features

- 🎥 **Screen Recording**: Record your screen with high quality (1080p, 60fps)
- 📁 **File Management**: Automatically saves recordings to your Documents folder
- 🎬 **Recording Library**: View and manage all your recorded vlogs
- 🗑️ **File Operations**: Delete recordings or open them in Finder
- 🎨 **Modern UI**: Clean, macOS-native interface with dark theme
- ⚡ **Fast Performance**: Built with TypeScript and React for optimal performance

## Requirements

- macOS (optimized for macOS, other platforms not supported)
- Node.js 18+ or Bun (recommended)
- Screen recording permissions

## Installation

1. **Clone and install dependencies:**

   ```bash
   cd vlog-electron
   bun install
   ```

2. **Grant screen recording permissions:**

   - Go to System Preferences > Security & Privacy > Privacy
   - Select "Screen Recording" from the left sidebar
   - Add your terminal app (Terminal.app, iTerm2, etc.) to the list
   - Restart your terminal

3. **Start the development server:**
   ```bash
   bun run dev
   ```

## Usage

### Recording

1. Click the "🔴 Start Recording" button
2. The app will request screen recording permissions (if not already granted)
3. Your screen recording will start immediately
4. Click "⏹️ Stop Recording" when finished
5. The recording will be automatically saved to `~/Documents/VlogRecordings/`

### Managing Recordings

- View all your recordings in the file list
- Click "📁 Show in Finder" to open the file location
- Click "🗑️ Delete" to remove a recording
- Files are sorted by creation date (newest first)

## File Format

- **Input**: Screen recording in WebM format (VP9 codec)
- **Output**: Currently saves as WebM (MP4 conversion coming soon)
- **Quality**: 1080p at 60fps with 8 Mbps video bitrate
- **Audio**: 128 kbps audio recording

## Development

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Main process entry point
│   └── preload.ts  # Preload script for secure IPC
└── renderer/       # React renderer process
    ├── src/
    │   ├── components/  # React components
    │   ├── services/    # Business logic
    │   └── App.tsx      # Main React app
    └── index.html       # HTML template
```

### Available Scripts

- `bun run dev` - Start development server with hot reload
- `bun run build` - Build for production
- `bun run start` - Run production build
- `bun run electron:pack` - Package app for distribution

## Technical Details

### Screen Recording

The app uses Electron's `desktopCapturer` API to capture screen content. The recording is done using the MediaRecorder API with high-quality settings:

- **Video**: VP9 codec at 8 Mbps bitrate
- **Audio**: 128 kbps with echo cancellation and noise suppression
- **Resolution**: 1920x1080 (configurable)
- **Frame Rate**: 60fps (configurable)

### File Management

- All recordings are saved to `~/Documents/VlogRecordings/`
- Files are named with timestamp: `vlog-YYYY-MM-DDTHH-mm-ss.webm`
- File metadata (size, creation date) is tracked and displayed

### Security

- Uses Electron's context isolation for secure IPC communication
- No external network requests
- All file operations are local to your machine

## Future Features

- [ ] WebM to MP4 conversion for better compatibility
- [ ] Video preview and playback
- [ ] Recording quality settings
- [ ] Audio-only recording mode
- [ ] Transcription and timeline features
- [ ] Video editing capabilities

## Troubleshooting

### Screen Recording Not Working

1. Ensure screen recording permissions are granted
2. Restart the app after granting permissions
3. Check that no other screen recording apps are running

### Files Not Saving

1. Check that the Documents folder is accessible
2. Ensure you have write permissions to the Documents folder
3. Check the console for error messages

### Performance Issues

1. Close other resource-intensive applications
2. Lower the recording quality in the code if needed
3. Ensure you have sufficient disk space

## License

MIT License - feel free to modify and distribute as needed.

