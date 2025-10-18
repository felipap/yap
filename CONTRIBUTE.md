# Contributing to Vlogger

Thank you for your interest in contributing to Vlogger! This guide will help you get started with development.

## About Vlogger

Vlogger is a desktop app for recording and managing your personal video logs. Record your screen, camera, or both, then organize everything in a smart library with AI-powered transcription and summaries.

## Tech Stack

- **Electron** - Desktop app framework
- **React** - Frontend UI library
- **TypeScript** - Type-safe JavaScript
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Styling framework
- **Bun** - Package manager and runtime
- **OpenAI Whisper** - Speech transcription
- **Google Gemini** - AI video summaries

## Development Setup

### Prerequisites

- [Bun](https://bun.sh/) (preferred package manager)
- Node.js 18+ (as fallback)
- macOS (for development and building)

### Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/felipap/vlogger.git
   cd vlogger
   ```

2. **Install dependencies**

   ```bash
   bun install
   ```

3. **Start development server**
   ```bash
   bun run dev
   ```

This will start:

- Vite dev server on `http://localhost:4000`
- TypeScript compiler in watch mode for main process
- Electron app with hot reload

### Available Scripts

- `bun run dev` - Start development environment
- `bun run build` - Build for production
- `bun run dist` - Build and package for distribution
- `bun run electron:pack` - Package the app without publishing
- `bun run generate-icon` - Generate app icons from PNG

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── ai/              # AI-related functionality
│   ├── lib/             # Utility libraries
│   ├── main.ts          # Main process entry point
│   ├── ipc.ts           # IPC handlers
│   └── window.ts        # Window management
├── renderer/            # Electron renderer process (React app)
│   └── src/
│       ├── pages/       # Page components
│       ├── shared/      # Shared components and utilities
│       └── ui/          # Reusable UI components
└── shared-types.ts      # Shared TypeScript types
```

## Development Guidelines

### Code Style

- Use TypeScript for all new code
- Follow the existing Prettier configuration
- Use meaningful variable and function names
- Write small, focused functions
- Use braces for all control structures (no single-line if statements)

### Frontend Guidelines

- **No default exports** except for page components (which should be named `Page`)
- **Co-locate components** that are only used once with their parent
- **Extract API calls** into separate functions
- **Break out SVGs** into separate components
- **Use theme-aware colors** from `global.css`
- **Prefer flex gaps** over margins between elements
- **Place UI components** in the `ui/` directory

### Backend Guidelines

- **Surgical try-catch blocks** - target specific operations that can fail
- **Don't worry about database migrations** - they're handled separately
- **Use server actions** when possible

### AI Integration

The app integrates with two AI services:

1. **OpenAI Whisper** - For video transcription
2. **Google Gemini** - For video summaries

You'll need API keys for both services. Set them up in your environment or through the app's settings.

## Building and Distribution

### Icons

To generate app icons from a PNG file:

```bash
bun run generate-icon
```

This will create all required icon sizes and convert them to `.icns` format.

### Building

```bash
# Development build
bun run build

# Production distribution
bun run dist
```

### Platform Support

- **macOS**: DMG and ZIP packages (ARM64 and x64)
- **Windows**: NSIS installer
- **Linux**: AppImage

## Releases

Create releases with conventional commits:

```bash
bun run release:patch  # 1.0.0 -> 1.0.1 (bug fixes)
bun run release:minor  # 1.0.0 -> 1.1.0 (new features)
bun run release:major  # 1.0.0 -> 2.0.0 (breaking changes)
git push origin main --tags
```

Use commit prefixes: `feat:`, `fix:`, `docs:`, `chore:`, etc.

## Debugging

### Logs

Vlogger writes logs to:

- `~/Library/Logs/Vlogger/main.log`
- `~/Library/Logs/Vlogger/error.log`

In development, logs are written to `~/Library/Logs/VloggerDev/`.

### macOS Permissions

If you encounter permission issues on macOS:

```bash
sudo tccutil reset All com.felipap.vlogger
```

### Development Tools

- Use React DevTools for frontend debugging
- Electron DevTools are available in development mode
- Check the main process logs for backend issues

## Testing

Currently, the project has basic test setup for AI functionality. To run tests:

```bash
bun test
```

## Contributing

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** following the guidelines above
4. **Test your changes** thoroughly
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Pull Request Guidelines

- Provide a clear description of what your PR does
- Include screenshots for UI changes
- Ensure all tests pass
- Follow the existing code style
- Keep PRs focused and reasonably sized

## Common Issues

### Build Issues

- Ensure you're using Bun as the package manager
- Clear `node_modules` and reinstall if needed
- Check that all required system permissions are granted

### Development Issues

- Make sure the Vite dev server is running on port 4000
- Check that TypeScript compilation is working
- Verify Electron can access the renderer process

## Getting Help

- Check existing [GitHub Issues](https://github.com/felipap/vlogger/issues)
- Start a [Discussion](https://github.com/felipap/vlogger/discussions) for questions
- Review the codebase for examples of similar functionality

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Thank you for contributing to Vlogger! 🎥
