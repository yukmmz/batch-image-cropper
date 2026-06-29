# Batch Image Cropper

A browser-based tool for cropping multiple images at once.  
No upload, no server — everything runs locally in your browser.

**→ [Open App](https://yukmmz.github.io/batch-image-cropper/)**

## Features

- **Per-image crop rect** — each image has its own independent crop rectangle
- **Alignment tools** — align centers, aspect ratios, sizes, or copy rect exactly across all images
- **Zoom & pan** — `Ctrl/Cmd + Scroll` to zoom, `Scroll` to pan, double-click to reset
- **Fullscreen** — `F` key or ⛶ button hides browser chrome for more canvas space
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
| `?` | Show keyboard shortcuts |

## Browser support

| Browser | Save method |
|---|---|
| Chrome / Edge | Direct folder write |
| Safari / Firefox | ZIP download |

## Development

Static HTML/CSS/JS — no build step required.

```bash
# Clone and open locally
git clone https://github.com/yukmmz/batch-image-cropper.git
open batch-image-cropper/index.html
```

## License

MIT
