<img src="assets/original.png" width="128" alt="Yap" />

# Yap

A desktop app for recording and revisiting your personal video logs.

Record your screen, camera, or both. Yap organizes everything in a searchable library and uses AI to transcribe and summarize your recordings so you can actually find things later.

<p align="left">
  <a href="https://github.com/felipap/yap/releases/latest"><strong>Download</strong></a>
  &nbsp;&middot;&nbsp;
  <a href="#features">Features</a>
  &nbsp;&middot;&nbsp;
  <a href="#faq">FAQ</a>
  &nbsp;&middot;&nbsp;
  <a href="CONTRIBUTE.md">Contributing</a>
</p>

## Features

**Recording** &mdash; Capture screen, camera, or both simultaneously. Audio-only mode too. Pick your devices, preview the feed, and hit record.

**Library** &mdash; All your recordings in one place, grouped by date. Search, filter, and drag-and-drop import for existing videos.

**Transcription** &mdash; Powered by OpenAI Whisper. Timestamped segments, chunked processing for long recordings, and a teleprompter view that syncs with playback.

**Summaries** &mdash; Google Gemini generates concise summaries of your recordings. Optionally personalized with your own context.

**Privacy-first** &mdash; Videos stay on your machine. AI services are only called when you explicitly request transcription or a summary.

## Download

Grab the latest release for your platform from the [releases page](https://github.com/felipap/yap/releases/latest).

| Platform | Format |
|----------|--------|
| macOS    | DMG (Apple Silicon & Intel) |
| Windows  | Installer |
| Linux    | AppImage |

## FAQ

<details>
  <summary><strong>What AI services does Yap use?</strong></summary>
  <p>OpenAI Whisper for transcription and Google Gemini for summaries. You provide your own API keys through the app's settings. Nothing is sent to these services unless you ask for it.</p>
</details>

<details>
  <summary><strong>Where are my recordings stored?</strong></summary>
  <p>Locally on your machine, in a folder you choose. Yap never uploads your videos anywhere. API keys are encrypted using your OS keychain.</p>
</details>

<details>
  <summary><strong>Can I import existing videos?</strong></summary>
  <p>Yes. Drag and drop video or audio files into the library. Yap generates thumbnails and extracts metadata automatically.</p>
</details>

<details>
  <summary><strong>What formats are supported?</strong></summary>
  <p>Common video formats like MP4, WebM, and MOV. Yap can also convert WebM and MOV files to MP4.</p>
</details>

Have another question? [Start a discussion.](https://github.com/felipap/yap/discussions/new/choose)

## Contributing

See [CONTRIBUTE.md](CONTRIBUTE.md) for development setup, project structure, and guidelines.

## License

MIT
