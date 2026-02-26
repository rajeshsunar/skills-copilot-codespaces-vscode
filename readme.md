# Power Sticky

Power Sticky is an offline-first, always-on-top sticky notes desktop app for Windows built with Electron + React.

## Features in V1

- Always-on-top notes window with persistent size and position.
- Minimize-to-tray behavior.
- Local JSON persistence in the Electron userData directory.
- Multiple notes in a sidebar with create, rename, delete, pin/unpin, and reorder.
- Real-time search across titles and content.
- Plain-text editor with checklist (`- [ ]`, `- [x]`) and auto bullet continuation.
- Keyboard shortcuts:
  - `Ctrl + N`: Create note
  - `Ctrl + D`: Delete selected note
- Debounced auto-save (500ms), plus save on blur and close.
- Theme toggle (dark and classic yellow sticky).
- Optional launch-on-startup toggle.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
