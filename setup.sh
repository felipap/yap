#!/bin/bash

echo "🎥 Setting up Vlog Electron..."

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install Bun first:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    exit 1
fi

echo "✅ Bun is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"

# Check if FFmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "⚠️  FFmpeg is not installed. Install it for MP4 conversion:"
    echo "   brew install ffmpeg"
    echo ""
    echo "   Without FFmpeg, recordings will be saved as WebM files."
    echo "   WebM files are still high quality but may have compatibility issues."
else
    echo "✅ FFmpeg is installed - MP4 conversion will be available"
fi

echo ""
echo "🔐 IMPORTANT: Grant screen recording permissions:"
echo "   1. Go to System Preferences > Security & Privacy > Privacy"
echo "   2. Select 'Screen Recording' from the left sidebar"
echo "   3. Add your terminal app (Terminal.app, iTerm2, etc.) to the list"
echo "   4. Restart your terminal"
echo ""
echo "🚀 To start the app, run:"
echo "   bun run dev"
echo ""
echo "✨ Setup complete! Happy vlogging!"

