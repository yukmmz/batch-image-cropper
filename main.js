// ── Constants ──────────────────────────────────────────────────────────────────

const HANDLE_R   = 6;
const HANDLE_HIT = 10;
const UNDO_LIMIT = 50;

const APP_VERSION = '1.0.0';
const APP_URL     = 'https://yukmmz.github.io/batch-image-cropper/';
const SRC_URL     = 'https://github.com/yukmmz/batch-image-cropper';

// ── State ─────────────────────────────────────────────────────────────────────

const images = [];  // [{file, img, rect:{x,y,w,h}, undoStack:[]}]
let idx = 0;

let dispScale = 1;
let dispOx = 0;
let dispOy = 0;

let drag = null;         // {mode, sx, sy, rect0}
let preDragRect = null;  // snapshot before drag (for undo on mouseup)

// ── DOM ───────────────────────────────────────────────────────────────────────

const canvas     = document.getElementById('canvas');
const ctx        = canvas.getContext('2d');
const canvasWrap = document.getElementById('canvas-wrap');
const dropVeil   = document.getElementById('drop-veil');
const fileInput  = document.getElementById('file-input');

const secNav     = document.getElementById('sec-nav');
const secRect    = document.getElementById('sec-rect');
const secModhint = document.getElementById('sec-modhint');
const secUndo    = document.getElementById('sec-undo');
const secAlign   = document.getElementById('sec-align');
const secSave    = document.getElementById('sec-save');

const navCounter = document.getElementById('nav-counter');
const navName    = document.getElementById('nav-name');
const btnPrev    = document.getElementById('btn-prev');
const btnNext    = document.getElementById('btn-next');

const sx      = document.getElementById('sx');
const sy      = document.getElementById('sy');
const sw      = document.getElementById('sw');
const sh      = document.getElementById('sh');

const btnUndo    = document.getElementById('btn-undo');
const btnAllFigs = document.getElementById('btn-allfigs');
const btnSave    = document.getElementById('btn-save');
const saveNote   = document.getElementById('save-note');
const suffix     = document.getElementById('suffix');

const modal      = document.getElementById('modal');
const modalBody  = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');

const verEl      = document.getElementById('ver');
const btnQr      = document.getElementById('btn-qr');
const qrOverlay  = document.getElementById('qr-overlay');
const qrClose    = document.getElementById('qr-close');
const qrAppUrl   = document.getElementById('qr-app-url');
const qrSrcUrl   = document.getElementById('qr-src-url');

// ── Geometry helpers ──────────────────────────────────────────────────────────

function clampRect(x, y, w, h, iw, ih) {
  w = Math.max(1, Math.min(Math.round(w), iw));
  h = Math.max(1, Math.min(Math.round(h), ih));
  x = Math.max(0, Math.min(iw - w, Math.round(x)));
  y = Math.max(0, Math.min(ih - h, Math.round(y)));
  return { x, y, w, h };
}

function placeCentered(cx, cy, w, h, iw, ih) {
  w = Math.max(1, Math.min(Math.round(w), iw));
  h = Math.max(1, Math.min(Math.round(h), ih));
  const x = Math.max(0, Math.min(iw - w, Math.round(cx - w / 2)));
  const y = Math.max(0, Math.min(ih - h, Math.round(cy - h / 2)));
  return { x, y, w, h };
}

function constrainAspect(nw, nh, w0, h0) {
  if (!w0 || !h0) return { nw, nh };
  const aspect = w0 / h0;
  if (Math.abs(nw - w0) / w0 >= Math.abs(nh - h0) / h0)
    nh = Math.max(1, Math.round(nw / aspect));
  else
    nw = Math.max(1, Math.round(nh * aspect));
  return { nw, nh };
}

// ── Image loading ─────────────────────────────────────────────────────────────

fileInput.addEventListener('change', e => loadFiles(e.target.files));

function loadFiles(files) {
  const list = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!list.length) return;

  Promise.all(list.map(file => new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const iw = img.naturalWidth, ih = img.naturalHeight;
      const w  = Math.min(400, iw),  h  = Math.min(300, ih);
      resolve({
        file, img,
        rect: {
          x: Math.floor((iw - w) / 2),
          y: Math.floor((ih - h) / 2),
          w, h,
        },
        undoStack: [],
      });
    };
    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  }))).then(results => {
    images.length = 0;
    results.filter(Boolean).forEach(e => images.push(e));
    idx = 0;
    showPanels();
    redraw();
    syncSpins();
  });
}

function showPanels() {
  [secNav, secRect, secModhint, secUndo, secAlign, secSave]
    .forEach(el => el.style.display = '');
  saveNote.textContent = ('showDirectoryPicker' in window)
    ? 'Will write files directly to a chosen folder.'
    : 'Safari/Firefox: will download a .zip file.';
}

// ── Drag & drop ───────────────────────────────────────────────────────────────

let dragCount = 0;
document.addEventListener('dragenter', e => {
  e.preventDefault();
  if (++dragCount === 1) dropVeil.classList.add('active');
});
document.addEventListener('dragleave', () => {
  if (--dragCount === 0) dropVeil.classList.remove('active');
});
document.addEventListener('dragover', e => e.preventDefault());
document.addEventListener('drop', e => {
  e.preventDefault();
  dragCount = 0;
  dropVeil.classList.remove('active');
  loadFiles(e.dataTransfer.files);
});

// ── Canvas sizing ─────────────────────────────────────────────────────────────

new ResizeObserver(() => {
  canvas.width  = canvasWrap.clientWidth;
  canvas.height = canvasWrap.clientHeight;
  redraw();
}).observe(canvasWrap);

// ── Drawing ───────────────────────────────────────────────────────────────────

function computeDisp(img) {
  const cw = canvas.width, ch = canvas.height;
  const iw = img.naturalWidth, ih = img.naturalHeight;
  const s  = Math.min(cw / iw, ch / ih);
  dispScale = s;
  dispOx = Math.floor((cw - iw * s) / 2);
  dispOy = Math.floor((ch - ih * s) / 2);
}

function redraw() {
  ctx.fillStyle = '#484848';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (!images.length) return;

  const entry = images[idx];
  const img   = entry.img;
  computeDisp(img);

  const dw = Math.floor(img.naturalWidth  * dispScale);
  const dh = Math.floor(img.naturalHeight * dispScale);
  ctx.drawImage(img, dispOx, dispOy, dw, dh);

  // Crop rectangle
  const { x, y, w, h } = entry.rect;
  const rx1 = Math.floor(dispOx + x * dispScale);
  const ry1 = Math.floor(dispOy + y * dispScale);
  const rw  = Math.ceil(w * dispScale);
  const rh  = Math.ceil(h * dispScale);

  ctx.lineWidth   = 2;
  ctx.strokeStyle = 'red';
  ctx.strokeRect(rx1, ry1, rw, rh);

  // Corner handles
  const r = HANDLE_R;
  ctx.fillStyle   = 'red';
  ctx.strokeStyle = 'white';
  ctx.lineWidth   = 1;
  for (const [hx, hy] of [
    [rx1,      ry1],
    [rx1 + rw, ry1],
    [rx1,      ry1 + rh],
    [rx1 + rw, ry1 + rh],
  ]) {
    ctx.fillRect(hx - r, hy - r, 2 * r, 2 * r);
    ctx.strokeRect(hx - r, hy - r, 2 * r, 2 * r);
  }

  // Filename — bottom-right of image display area, full text, no truncation
  const name = entry.file.name;
  ctx.font = '12px monospace';
  const tw = ctx.measureText(name).width;
  const th = 14;
  const m  = 6;
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(dispOx + dw - tw - m - 4, dispOy + dh - th - m, tw + 8, th + 6);
  ctx.fillStyle = 'white';
  ctx.fillText(name, dispOx + dw - tw - m, dispOy + dh - m);

  // Nav labels
  navCounter.textContent = `${idx + 1} / ${images.length}`;
  navName.textContent    = name;
}

// ── Hit testing ───────────────────────────────────────────────────────────────

function getRectCv() {
  const { x, y, w, h } = images[idx].rect;
  const x1 = dispOx + x * dispScale;
  const y1 = dispOy + y * dispScale;
  return { x1, y1, x2: x1 + w * dispScale, y2: y1 + h * dispScale };
}

function hitCorner(ex, ey) {
  const { x1, y1, x2, y2 } = getRectCv();
  const r = HANDLE_HIT;
  if (Math.abs(ex - x1) <= r && Math.abs(ey - y1) <= r) return 'tl';
  if (Math.abs(ex - x2) <= r && Math.abs(ey - y1) <= r) return 'tr';
  if (Math.abs(ex - x1) <= r && Math.abs(ey - y2) <= r) return 'bl';
  if (Math.abs(ex - x2) <= r && Math.abs(ey - y2) <= r) return 'br';
  return null;
}

function hitBody(ex, ey) {
  const { x1, y1, x2, y2 } = getRectCv();
  return ex >= x1 && ex <= x2 && ey >= y1 && ey <= y2;
}

function canvasPos(e) {
  const r = canvas.getBoundingClientRect();
  return { ex: e.clientX - r.left, ey: e.clientY - r.top };
}

// ── Mouse events ──────────────────────────────────────────────────────────────

canvas.addEventListener('contextmenu', e => e.preventDefault());

canvas.addEventListener('mousedown', e => {
  if (!images.length) return;
  const { ex, ey } = canvasPos(e);
  const corner = hitCorner(ex, ey);
  preDragRect = { ...images[idx].rect };

  if (corner) {
    drag = { mode: 'resize_' + corner, sx: ex, sy: ey, rect0: preDragRect };
  } else if (hitBody(ex, ey)) {
    drag = { mode: 'move', sx: ex, sy: ey, rect0: preDragRect };
  } else {
    drag = null;
    preDragRect = null;
  }
  e.preventDefault();
});

canvas.addEventListener('mousemove', e => {
  if (!images.length) return;
  const { ex, ey } = canvasPos(e);
  const shift = e.shiftKey;
  const ctrl  = e.ctrlKey || e.metaKey;   // Ctrl on Win/Linux, Cmd on Mac

  // Cursor feedback
  const corner = hitCorner(ex, ey);
  if      (corner === 'tl' || corner === 'br') canvas.style.cursor = 'nwse-resize';
  else if (corner === 'tr' || corner === 'bl') canvas.style.cursor = 'nesw-resize';
  else if (hitBody(ex, ey))                    canvas.style.cursor = 'move';
  else                                          canvas.style.cursor = 'crosshair';

  if (!drag || !(e.buttons & 1)) return;

  const s  = dispScale;
  const dx = (ex - drag.sx) / s;
  const dy = (ey - drag.sy) / s;
  const { x: x0, y: y0, w: w0, h: h0 } = drag.rect0;
  const entry = images[idx];
  const iw = entry.img.naturalWidth;
  const ih = entry.img.naturalHeight;

  let newRect;

  if (drag.mode === 'move') {
    let nx = x0 + dx, ny = y0 + dy;
    if (shift) {
      // Constrain to dominant axis
      if (Math.abs(dx) >= Math.abs(dy)) ny = y0;
      else                               nx = x0;
    }
    newRect = clampRect(nx, ny, w0, h0, iw, ih);

  } else {
    // resize_<corner>
    const cid  = drag.mode.slice(7);  // 'tl' | 'tr' | 'bl' | 'br'
    const sgnW = (cid === 'tr' || cid === 'br') ?  1 : -1;
    const sgnH = (cid === 'bl' || cid === 'br') ?  1 : -1;
    const mult = ctrl ? 2 : 1;   // Ctrl/Cmd: resize from center (both sides)

    let nw = Math.max(1, Math.round(w0 + mult * sgnW * dx));
    let nh = Math.max(1, Math.round(h0 + mult * sgnH * dy));

    if (shift) ({ nw, nh } = constrainAspect(nw, nh, w0, h0));

    if (ctrl) {
      // Center stays fixed
      newRect = placeCentered(x0 + w0 / 2, y0 + h0 / 2, nw, nh, iw, ih);
    } else {
      // Opposite corner is fixed
      let nx, ny;
      if      (cid === 'br') { nx = x0;           ny = y0; }
      else if (cid === 'tl') { nx = x0 + w0 - nw; ny = y0 + h0 - nh; }
      else if (cid === 'tr') { nx = x0;            ny = y0 + h0 - nh; }
      else                   { nx = x0 + w0 - nw;  ny = y0; }          // bl
      newRect = clampRect(nx, ny, nw, nh, iw, ih);
    }
  }

  entry.rect = newRect;
  syncSpins();
  redraw();
});

canvas.addEventListener('mouseup', () => {
  // Push undo only if rect actually changed
  if (drag && preDragRect) {
    const r = images[idx].rect;
    const p = preDragRect;
    if (r.x !== p.x || r.y !== p.y || r.w !== p.w || r.h !== p.h) {
      pushUndo(idx, p);
    }
  }
  drag = null;
  preDragRect = null;
});

canvas.addEventListener('mouseleave', () => {
  if (drag && preDragRect) {
    const r = images[idx].rect;
    const p = preDragRect;
    if (r.x !== p.x || r.y !== p.y || r.w !== p.w || r.h !== p.h) {
      pushUndo(idx, p);
    }
  }
  drag = null;
  preDragRect = null;
});

// ── Spinboxes ─────────────────────────────────────────────────────────────────

function syncSpins() {
  if (!images.length) return;
  const { x, y, w, h } = images[idx].rect;
  sx.value = x; sy.value = y; sw.value = w; sh.value = h;
}

function onSpinChange() {
  if (!images.length) return;
  const entry = images[idx];
  pushUndo(idx, { ...entry.rect });
  entry.rect = clampRect(
    +sx.value || 0, +sy.value || 0,
    +sw.value || 1, +sh.value || 1,
    entry.img.naturalWidth, entry.img.naturalHeight,
  );
  syncSpins();
  redraw();
}

[sx, sy, sw, sh].forEach(el => el.addEventListener('change', onSpinChange));

// ── Undo ──────────────────────────────────────────────────────────────────────

function pushUndo(i, rect) {
  const stack = images[i].undoStack;
  stack.push({ ...rect });
  if (stack.length > UNDO_LIMIT) stack.shift();
}

btnUndo.addEventListener('click', () => {
  if (!images.length) return;
  const entry = images[idx];
  if (!entry.undoStack.length) return;
  entry.rect = entry.undoStack.pop();
  syncSpins();
  redraw();
});

document.addEventListener('keydown', e => {
  // Ctrl/Cmd+Z → undo
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    btnUndo.click();
    return;
  }
  // Arrow keys → navigate (skip when typing in inputs)
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;
  if (e.key === 'ArrowLeft')  btnPrev.click();
  if (e.key === 'ArrowRight') btnNext.click();
});

// ── Navigation ────────────────────────────────────────────────────────────────

btnPrev.addEventListener('click', () => {
  if (idx > 0) { idx--; redraw(); syncSpins(); }
});

btnNext.addEventListener('click', () => {
  if (idx < images.length - 1) { idx++; redraw(); syncSpins(); }
});

// ── Alignment ─────────────────────────────────────────────────────────────────

document.getElementById('btn-centers').addEventListener('click', () => {
  const { x, y, w, h } = images[idx].rect;
  const tcx = x + w / 2, tcy = y + h / 2;
  images.forEach((entry, i) => {
    if (i === idx) return;
    const { w: ew, h: eh } = entry.rect;
    entry.rect = placeCentered(tcx, tcy, ew, eh,
      entry.img.naturalWidth, entry.img.naturalHeight);
  });
  redraw();
});

document.getElementById('btn-aspect').addEventListener('click', () => {
  const { w: tw, h: th } = images[idx].rect;
  const ratio = tw / th;
  images.forEach((entry, i) => {
    if (i === idx) return;
    const { x, y, w, h } = entry.rect;
    const area = w * h;
    const cx = x + w / 2, cy = y + h / 2;
    const nw = Math.max(1, Math.round(Math.sqrt(area * ratio)));
    const nh = Math.max(1, Math.round(Math.sqrt(area / ratio)));
    entry.rect = placeCentered(cx, cy, nw, nh,
      entry.img.naturalWidth, entry.img.naturalHeight);
  });
  redraw();
});

document.getElementById('btn-size').addEventListener('click', () => {
  const { w: tw, h: th } = images[idx].rect;
  images.forEach((entry, i) => {
    if (i === idx) return;
    const { x, y, w, h } = entry.rect;
    const cx = x + w / 2, cy = y + h / 2;
    entry.rect = placeCentered(cx, cy, tw, th,
      entry.img.naturalWidth, entry.img.naturalHeight);
  });
  redraw();
});

document.getElementById('btn-match').addEventListener('click', () => {
  const { x: tx, y: ty, w: tw, h: th } = images[idx].rect;
  images.forEach((entry, i) => {
    if (i === idx) return;
    entry.rect = clampRect(tx, ty, tw, th,
      entry.img.naturalWidth, entry.img.naturalHeight);
  });
  redraw();
});

// ── All Figs ──────────────────────────────────────────────────────────────────

// Returns the (cols, rows, cellW, cellH) that makes the overall grid aspect
// ratio closest to 16:9, given the available pixel area and image aspect ratios.
function bestGrid(N, imgs, availW, availH) {
  const GAP    = 8;
  const NAME_H = 18;
  const TARGET = 16 / 9;

  const avgAR = imgs.reduce((s, e) => s + e.img.naturalWidth / e.img.naturalHeight, 0) / N;

  let bestCols = Math.ceil(Math.sqrt(N));
  let bestScore = Infinity;
  let bestArea  = 0;

  for (let cols = 1; cols <= N; cols++) {
    const rows = Math.ceil(N / cols);

    // Reject layouts where the last row is less than half full (looks sparse)
    const lastRow = N - (rows - 1) * cols;
    if (lastRow < Math.ceil(cols / 2)) continue;

    const cellW = (availW - (cols - 1) * GAP) / cols;
    const cellH = (availH - (rows - 1) * GAP) / rows - NAME_H;
    if (cellW < 20 || cellH < 10) continue;

    // Thumb size using average AR for scoring
    const tw = Math.min(cellW, cellH * avgAR);
    const th = tw / avgAR;

    const gridW = cols * tw + (cols - 1) * GAP;
    const gridH = rows * (th + NAME_H) + (rows - 1) * GAP;
    const score = Math.abs(gridW / gridH - TARGET);
    const area  = tw * th;

    // Prefer closer AR; break near-ties (within 0.05) by larger thumb
    if (score < bestScore - 0.05 || (score <= bestScore + 0.05 && area > bestArea)) {
      bestScore = score;
      bestArea  = area;
      bestCols  = cols;
    }
  }

  const cols  = bestCols;
  const rows  = Math.ceil(N / cols);
  const GAP_  = 8;
  const cellW = Math.floor((availW - (cols - 1) * GAP_) / cols);
  const cellH = Math.floor((availH - (rows - 1) * GAP_) / rows) - NAME_H;
  return { cols, rows, cellW, cellH: Math.max(1, cellH) };
}

function buildAllFigs() {
  const N = images.length;
  if (!N) return;

  const GAP    = 8;
  const NAME_H = 18;

  // clientWidth includes padding (12px each side) → subtract to get content area
  const availW = modalBody.clientWidth  - 24;
  const availH = modalBody.clientHeight - 24;

  const { cols, rows, cellW, cellH } = bestGrid(N, images, availW, availH);

  // Apply CSS grid
  modalBody.style.display             = 'grid';
  modalBody.style.gridTemplateColumns = `repeat(${cols}, ${cellW}px)`;
  modalBody.style.gridAutoRows        = `${cellH + NAME_H}px`;
  modalBody.style.gap                 = `${GAP}px`;
  modalBody.style.alignContent        = 'start';

  images.forEach((entry, i) => {
    const img   = entry.img;
    const imgAR = img.naturalWidth / img.naturalHeight;

    // Scale each image to fit cellW × cellH while preserving its own AR
    let tw = cellW, th = cellH;
    if (tw / th > imgAR) tw = Math.floor(th * imgAR);
    else                  th = Math.floor(tw / imgAR);
    tw = Math.max(1, tw); th = Math.max(1, th);

    const cv  = document.createElement('canvas');
    cv.width  = tw; cv.height = th;
    const cx2 = cv.getContext('2d');
    cx2.drawImage(img, 0, 0, tw, th);

    const { x, y, w, h } = entry.rect;
    const s = tw / img.naturalWidth;
    cx2.strokeStyle = 'red';
    cx2.lineWidth   = 2;
    cx2.strokeRect(Math.floor(x * s), Math.floor(y * s), Math.ceil(w * s), Math.ceil(h * s));

    const cell = document.createElement('div');
    cell.className = 'thumb-cell' + (i === idx ? ' active' : '');

    const lbl = document.createElement('div');
    lbl.className   = 'thumb-name';
    lbl.textContent = entry.file.name;

    cell.appendChild(cv);
    cell.appendChild(lbl);
    cell.addEventListener('click', () => {
      idx = i;
      redraw(); syncSpins();
      modal.style.display = 'none';
    });
    modalBody.appendChild(cell);
  });
}

btnAllFigs.addEventListener('click', () => {
  modalBody.innerHTML = '';
  modal.style.display = 'flex';
  // Wait one frame so the modal is laid out and clientWidth/Height are valid
  requestAnimationFrame(buildAllFigs);
});

modalClose.addEventListener('click', () => { modal.style.display = 'none'; });
modal.addEventListener('click', e => {
  if (e.target === modal) modal.style.display = 'none';
});

// ── Save ──────────────────────────────────────────────────────────────────────

async function cropBlob(entry) {
  const { x, y, w, h } = entry.rect;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  c.getContext('2d').drawImage(entry.img, x, y, w, h, 0, 0, w, h);
  const mime = entry.file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  return new Promise(res => c.toBlob(res, mime, 0.95));
}

function outFilename(entry) {
  const n   = entry.file.name;
  const dot = n.lastIndexOf('.');
  const suf = suffix.value || '_cropped';
  return dot >= 0 ? n.slice(0, dot) + suf + n.slice(dot) : n + suf;
}

btnSave.addEventListener('click', async () => {
  if (!images.length) return;

  // File System Access API — Chrome / Edge
  if ('showDirectoryPicker' in window) {
    let dirHandle;
    try {
      dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
    } catch {
      return;  // user cancelled
    }
    btnSave.disabled = true;
    btnSave.textContent = 'Saving…';
    try {
      for (const entry of images) {
        const blob = await cropBlob(entry);
        const fh   = await dirHandle.getFileHandle(outFilename(entry), { create: true });
        const wr   = await fh.createWritable();
        await wr.write(blob);
        await wr.close();
      }
      alert(`Saved ${images.length} image(s).`);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Save Cropped Images';
    }

  } else {
    // ZIP fallback — Safari / Firefox
    if (typeof JSZip === 'undefined') {
      alert('JSZip failed to load. Check your internet connection.');
      return;
    }
    btnSave.disabled = true;
    btnSave.textContent = 'Building ZIP…';
    try {
      const zip = new JSZip();
      for (const entry of images) {
        const blob = await cropBlob(entry);
        zip.file(outFilename(entry), await blob.arrayBuffer());
      }
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const a = document.createElement('a');
      a.href     = URL.createObjectURL(zipBlob);
      a.download = 'cropped_images.zip';
      a.click();
      URL.revokeObjectURL(a.href);
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = 'Save Cropped Images';
    }
  }
});

// ── Version & QR ─────────────────────────────────────────────────────────────

verEl.textContent = `Batch Image Cropper v${APP_VERSION}`;
qrAppUrl.textContent = APP_URL;
qrSrcUrl.textContent = SRC_URL;

btnQr.addEventListener('click', () => { qrOverlay.hidden = false; });
qrClose.addEventListener('click', () => { qrOverlay.hidden = true; });
qrOverlay.addEventListener('click', e => { if (e.target === qrOverlay) qrOverlay.hidden = true; });
