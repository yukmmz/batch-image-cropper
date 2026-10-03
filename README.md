# Batch Image Cropper

*English / [日本語](README_ja.md)*

**→ [Open App](https://yukmmz.github.io/batch-image-cropper/)**

A browser-based tool for cropping multiple images at once.  
No upload, no server — everything runs locally in your browser.

## Features

- **Per-image crop rect** — each image has its own independent crop rectangle
- **Alignment tools** — align centers, aspect ratios, sizes, or copy rect exactly across all images
- **Zoom & pan** — `Ctrl/Cmd + Scroll` to zoom, `Scroll` to pan, double-click to reset
- **How to use (?)** — the ? button at the top of the sidebar (or the `?` key) opens a help window with basic usage, all keyboard shortcuts and touch gestures
- **Fullscreen** — `F` key or the ⛶ button (top of the sidebar) hides browser chrome for more canvas space
- **Settings (⚙)** — language (Japanese / English), QR codes for sharing, changelog, link to other apps
- **Undo** — per-image undo history (`Ctrl/Cmd + Z`)
- **JSON export / import** — save and restore crop rects by filename
- **Touch support** — single-touch drag to move/resize, pinch to zoom (iPad / tablet)
- **Save options**
  - Chrome / Edge: write files directly to a chosen folder (File System Access API)
  - Safari / Firefox: download a `.zip` containing all cropped images

## Usage

1. Click **Load Images** or drag & drop image files onto the window
2. Drag the red crop rectangle to position it; drag corners to resize
3. Use the alignment buttons to synchronize rects across images
4. Click **Save Cropped Images** to export

### Modifier keys

| Key | Effect |
|---|---|
| `Shift` + resize | Lock aspect ratio |
| `Ctrl / Cmd` + resize | Resize from center |
| `Shift` + move | Constrain to H or V axis |
| `←` / `→` | Navigate images |
| `Ctrl / Cmd + Z` | Undo |
| `F` | Toggle fullscreen |
| `?` | Open the "How to use" window (also the ? button) |
| `Esc` | Close the open window |

## Running locally

Static HTML/CSS/JS — no build step required.

```bash
# Clone and serve locally
git clone https://github.com/yukmmz/batch-image-cropper.git
cd batch-image-cropper
python3 -m http.server 8000
# then open http://localhost:8000
```

Tests (pure logic, no browser needed): `node --test` in the repository root.

## Saved data

- Images and crop rects are **not** stored anywhere; they are gone when you close the page. Use **JSON export** to keep the crop rects.
- The browser's localStorage keeps only the language and the last version you have seen (keys starting with `batch-image-cropper/`). Nothing is sent to a server.
- To reset, clear this site's data in your browser settings.

## Browser support

| Browser | Save method |
|---|---|
| Chrome / Edge | Direct folder write |
| Safari / Firefox | ZIP download |

## License

MIT — see [LICENSE](LICENSE).
