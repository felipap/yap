# Video Transcription Feature

This vlog-electron app now includes video transcription capabilities using OpenAI's Whisper API.

## Setup

1. Install dependencies:

   ```bash
   bun install
   ```

2. Get an OpenAI API key from [platform.openai.com](https://platform.openai.com/api-keys)

3. Add your API key to the vlog-settings.json file:
   ```json
   {
     "selectedCameraId": "...",
     "recordingMode": "camera",
     "openaiApiKey": "sk-your-api-key-here",
     "windowBounds": { ... }
   }
   ```

## Usage

1. Open any recorded video in the app
2. Click the "🎤 Transcribe" button
3. Wait for the transcription to complete
4. Click "📝 Show Transcript" to view the transcription with timestamps
5. Click on any transcript segment to jump to that time in the video

## Features

- **Automatic audio extraction** from video files using FFmpeg
- **OpenAI Whisper integration** for high-quality speech-to-text
- **Timestamped segments** for easy navigation
- **Error handling** with user-friendly error messages
- **Persistent storage** - transcriptions are saved and loaded automatically
- **Clickable segments** - click any transcript line to jump to that time in the video

## Requirements

- FFmpeg must be installed on your system
- Valid OpenAI API key
- Internet connection for API calls

## Error Handling

The transcription feature includes comprehensive error handling:

- Network errors are caught and displayed to the user
- API key validation
- FFmpeg availability checks
- Graceful fallbacks for missing dependencies

## Architecture

- `TranscriptionService` - Main process service for audio extraction and API calls
- `TranscriptionPanel` - React component with error boundary
- `useBoundary` - Custom hook for error handling
- `ErrorBoundary` - React error boundary component
