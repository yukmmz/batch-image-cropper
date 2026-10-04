// ── Constants ──────────────────────────────────────────────────────────────────

const HANDLE_R   = 6;
const HANDLE_HIT = 10;
const UNDO_LIMIT = 50;

const APP_VERSION = '1.3.0';
const APP_URL     = 'https://yukmmz.github.io/batch-image-cropper/';
const SRC_URL     = 'https://github.com/yukmmz/batch-image-cropper';
/* Shared feedback endpoint (Google Apps Script web app, one for every yukmmz.github.io app).
 * Public on purpose: it can only append a row to a sheet and post to a Discord channel. */
const FEEDBACK_URL = 'https://script.google.com/macros/s/AKfycbxFJ-rTK2e5h05r6_j0RJJu-1Fo4Or3nsAnYcnGXC2i9I8FEdOIbNaXI1BfjunkQHEP/exec';
const APP_ID       = 'batch-image-cropper';

const LANG_KEY         = 'batch-image-cropper/lang';
const SEEN_VERSION_KEY = 'batch-image-cropper/seen-version';
const STORAGE_PREFIX   = 'batch-image-cropper/';

// ── Changelog ─────────────────────────────────────────────────────────────────

/* What changed, newest first, shown from the settings sheet and from the
 * version under the app name. Bumping APP_VERSION means adding an entry here;
 * the first entry must match APP_VERSION. Written for users, in both languages. */
const CHANGELOG = [
  { version: '1.3.0', date: '2026-10-04', items: [
    { ja: 'サイドバー上端に「FB」ボタンを追加しました。ご意見・不具合の報告を開発者に送れます',
      en: 'New "FB" button at the top of the sidebar: send feedback or a bug report to the developer' },
  ] },
  { version: '1.2.0', date: '2026-10-01', items: [
    { ja: '使い方の窓を追加しました。サイドバー上端の ? ボタン（または ? キー）で開きます。キーボードショートカットの一覧もここにまとめました',
      en: 'Added a "How to use" window, opened by the ? button at the top of the sidebar (or the ? key); the keyboard shortcut list is now part of it' },
    { ja: 'サイドバー下の ? ボタン（ショートカット一覧）は、上端の ? に置き換えました',
      en: 'The ? button at the bottom of the sidebar (shortcut list) was replaced by the ? at the top' },
    { ja: '全画面表示中は、全画面ボタンが「縮小」の形に変わるようにしました',
      en: 'While in full screen, the full-screen button changes to a "shrink" icon' },
  ] },
  { version: '1.1.0', date: '2026-10-01', items: [
    { ja: 'サイドバーの一番上にアプリ名とバージョンを表示するようにしました。バージョンを押すと更新履歴が開きます',
      en: 'The app name and version are shown at the top of the sidebar; click the version to open this changelog' },
    { ja: '設定（⚙）を追加しました。言語の切り替え・QR コードでの共有・更新履歴・他のアプリへのリンクがあります',
      en: 'Added settings (⚙) with language, sharing by QR code, the changelog and a link to other apps' },
    { ja: '全画面表示ボタン（⛶）をサイドバーの一番上（⚙ の左）に移しました。F キーも引き続き使えます',
      en: 'The full-screen button (⛶) moved to the top of the sidebar, next to ⚙; the F key still works' },
    { ja: '日本語の表示に対応しました（⚙ で日本語 / English を切り替え）',
      en: 'Added a Japanese UI (switch between Japanese and English in ⚙)' },
  ] },
  { version: '1.0.0', date: '2026-06-29', items: [
    { ja: '最初の公開版。複数の画像をまとめて切り抜き、フォルダ（Chrome / Edge）または ZIP（Safari / Firefox）に保存できます',
      en: 'First release: crop many images at once and save them to a folder (Chrome / Edge) or a ZIP (Safari / Firefox)' },
    { ja: '切り抜き枠は画像ごとに別々に持ち、ドラッグで移動・角でリサイズできます（Shift で縦横比固定、Ctrl/Cmd で中心から）',
      en: 'Each image has its own crop rectangle: drag to move, drag a corner to resize (Shift keeps the aspect ratio, Ctrl/Cmd resizes from the center)' },
    { ja: '今の画像に合わせて、全画像の枠の中心・縦横比・大きさをそろえる（またはそのままコピーする）機能',
      en: 'Align the centers, aspect ratios or sizes of all rectangles to the current image, or copy it exactly' },
    { ja: '元に戻す（Ctrl/Cmd + Z）、拡大・移動（Ctrl/Cmd + スクロール、スクロール）、全画面表示（F）',
      en: 'Undo (Ctrl/Cmd + Z), zoom and pan (Ctrl/Cmd + scroll, scroll), full screen (F)' },
    { ja: '切り抜き枠を JSON で書き出し・読み込み',
      en: 'Export and import the crop rectangles as JSON' },
    { ja: 'キーボードショートカット一覧（?）、タッチ操作（ドラッグ・ピンチ）、共有用の QR コード',
      en: 'Keyboard shortcut list (?), touch support (drag and pinch), and QR codes for sharing' },
  ] },
];

// ── UI strings ────────────────────────────────────────────────────────────────

/* `c.*` keys are the common ones every yukmmz.github.io app uses with the
 * same wording; the rest belong to this app. Exported files are not translated. */
const STRINGS = {
  ja: {
    'c.settings': '設定', 'c.close': '閉じる', 'c.language': '言語', 'c.share': '共有',
    prevImage: '前の画像（←）', nextImage: '次の画像（→）',
    'c.showQr': 'QR コードを表示', 'c.changelog': '更新履歴', 'c.showChangelog': '表示',
    'c.otherApps': '他のアプリ', 'c.openPortal': 'アプリ一覧を開く', 'c.data': 'データ',
    'c.clearData': '保存データを消す', 'c.fullscreen': '全画面表示', 'c.exitFullscreen': '全画面を終了', 'c.help': '使い方',
    'c.feedback': 'フィードバックを送る', 'c.feedbackLead': 'ご意見・ご要望・不具合の報告をお寄せください。',
    'c.feedbackMessage': 'フィードバックの内容', 'c.feedbackPlaceholder': '使ってみた感想、困ったこと、ほしい機能など',
    'c.feedbackContact': '連絡先（任意・返信がほしい場合）',
    'c.feedbackNote': '送信を押したときに、書いた内容とアプリ名・バージョン・表示言語だけを開発者に送ります。',
    'c.feedbackSend': '送信', 'c.feedbackSending': '送信中…', 'c.feedbackThanks': '送信しました。ありがとうございます！',
    'c.feedbackEmpty': '内容を入力してください。', 'c.feedbackError': '送信できませんでした。時間をおいてもう一度お試しください。',
    loadImages: '画像を読み込む', dropHint: 'またはどこにでもドラッグ＆ドロップ',
    dropVeil: 'ここに画像をドロップ',
    cropRect: '切り抜き枠（この画像）',
    modHint: 'Shift+リサイズ &rarr; 縦横比を固定<br>Ctrl/Cmd+リサイズ &rarr; 中心から<br>Shift+移動 &rarr; 縦か横だけ',
    undo: '↩ 元に戻す',
    alignLegend: '今の画像に合わせる',
    alignCenters: '中心をそろえる', alignAspect: '縦横比をそろえる',
    alignSize: '大きさをそろえる', matchAll: 'すべて同じにする',
    alignDesc: '中心: 中心を移動、大きさは各自のまま<br>縦横比: 中心と面積を保ち、形を変える<br>大きさ: 中心を保ち、今の W&times;H にする<br>すべて: x,y,w,h をそのままコピー',
    cropData: '切り抜きデータ',
    exportJson: '枠を書き出す（JSON）', importJson: '枠を読み込む（JSON）',
    allFigs: '全画像を一覧', suffix: '接尾辞',
    saveCropped: '切り抜いた画像を保存', saving: '保存中…', buildingZip: 'ZIP を作成中…',
    saveNoteFolder: '選んだフォルダに直接書き出します。',
    saveNoteZip: 'Safari/Firefox: .zip ファイルをダウンロードします。',
    savedN: '{n} 枚の画像を保存しました。',
    jszipFailed: 'JSZip を読み込めませんでした。インターネット接続を確認してください。',
    invalidJson: 'JSON ファイルが正しくありません。',
    toastUndone: '元に戻しました', toastCenters: '中心をそろえました',
    toastAspect: '縦横比をそろえました', toastSize: '大きさをそろえました',
    toastMatch: 'すべての枠を同じにしました',
    allFigsHead: '全画像 — クリックで移動',
    help:
      '<h3>使い方</h3>' +
      '<ol>' +
      '<li><strong>画像を読み込む</strong>を押すか、画像ファイルを画面のどこかにドラッグ＆ドロップします（複数可）。</li>' +
      '<li>赤い枠が切り抜く範囲です。枠の内側をドラッグして移動、角をドラッグしてリサイズします。' +
      '左の X / Y / W / H に数値を入れても変えられます。</li>' +
      '<li>枠は<strong>画像ごとに別々</strong>です。◀ / ▶（または ← / → キー）で画像を切り替えます。' +
      '<strong>全画像を一覧</strong>で全体を見て、押した画像へ移動できます。</li>' +
      '<li><strong>今の画像に合わせる</strong>で、今の画像の枠を基準に全画像の枠をそろえます' +
      '（中心 / 縦横比 / 大きさ / すべて同じ）。</li>' +
      '<li><strong>切り抜いた画像を保存</strong>で書き出します。Chrome / Edge は選んだフォルダへ直接、' +
      'Safari / Firefox は .zip のダウンロードです。ファイル名には接尾辞（初期値 <code>_cropped</code>）が付きます。</li>' +
      '</ol>' +
      '<p>枠の位置は <strong>切り抜きデータ</strong> から JSON で書き出し・読み込みできます（ファイル名で対応づけ）。</p>' +
      '<h3>キーボードショートカット</h3>' +
      '<table class="help-keys">' +
      '<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>前 / 次の画像</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd></td><td>元に戻す</td></tr>' +
      '<tr><td><kbd>F</kbd></td><td>全画面表示の切り替え</td></tr>' +
      '<tr><td><kbd>?</kbd></td><td>この使い方を開く</td></tr>' +
      '<tr><td><kbd>Esc</kbd></td><td>開いている窓を閉じる</td></tr>' +
      '</table>' +
      '<h3>切り抜き枠の操作</h3>' +
      '<table class="help-keys">' +
      '<tr><td>枠の内側をドラッグ</td><td>枠を移動</td></tr>' +
      '<tr><td>角をドラッグ</td><td>枠をリサイズ</td></tr>' +
      '<tr><td><kbd>Shift</kbd> + リサイズ</td><td>縦横比を固定</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + リサイズ</td><td>中心からリサイズ</td></tr>' +
      '<tr><td><kbd>Shift</kbd> + 移動</td><td>縦か横だけに移動</td></tr>' +
      '</table>' +
      '<h3>拡大・移動</h3>' +
      '<table class="help-keys">' +
      '<tr><td><kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + スクロール</td><td>拡大 / 縮小</td></tr>' +
      '<tr><td>スクロール</td><td>表示位置を移動</td></tr>' +
      '<tr><td>キャンバスをダブルクリック</td><td>拡大と位置を元に戻す</td></tr>' +
      '</table>' +
      '<h3>iPad / タッチ操作</h3>' +
      '<table class="help-keys">' +
      '<tr><td>1 本指でドラッグ</td><td>枠を移動 / リサイズ</td></tr>' +
      '<tr><td>ピンチ</td><td>拡大 / 縮小</td></tr>' +
      '</table>' +
      '<p class="note">Safari（iPad / iPhone）では保存は .zip のダウンロードになります。</p>' +
      '<p class="note">画像はこのブラウザの中だけで処理され、サーバーへは送信されません。</p>',
  },
  en: {
    'c.settings': 'Settings', 'c.close': 'Close', 'c.language': 'Language', 'c.share': 'Share',
    prevImage: 'Previous image (←)', nextImage: 'Next image (→)',
    'c.showQr': 'Show QR codes', 'c.changelog': 'Changelog', 'c.showChangelog': 'Show',
    'c.otherApps': 'Other apps', 'c.openPortal': 'Open app list', 'c.data': 'Data',
    'c.clearData': 'Clear saved data', 'c.fullscreen': 'Full screen', 'c.exitFullscreen': 'Exit full screen', 'c.help': 'How to use',
    'c.feedback': 'Send feedback', 'c.feedbackLead': 'Comments, requests and bug reports are welcome.',
    'c.feedbackMessage': 'Your feedback', 'c.feedbackPlaceholder': 'What you liked, what was hard, what you would like to see…',
    'c.feedbackContact': 'Contact (optional, if you would like a reply)',
    'c.feedbackNote': 'Only what you write, plus the app name, version and display language, is sent to the developer when you press Send.',
    'c.feedbackSend': 'Send', 'c.feedbackSending': 'Sending…', 'c.feedbackThanks': 'Sent. Thank you!',
    'c.feedbackEmpty': 'Please write something first.', 'c.feedbackError': 'Could not send. Please try again later.',
    loadImages: 'Load Images', dropHint: 'or drag & drop anywhere',
    dropVeil: 'Drop images here',
    cropRect: 'Crop Rect (this image)',
    modHint: 'Shift+resize &rarr; lock aspect ratio<br>Ctrl/Cmd+resize &rarr; from center<br>Shift+move &rarr; H or V axis only',
    undo: '↩ Undo',
    alignLegend: 'Align to Current Image',
    alignCenters: 'Align Centers', alignAspect: 'Align Aspect Ratio',
    alignSize: 'Align Size', matchAll: 'Match All',
    alignDesc: 'Centers: move center, keep each size<br>Aspect: keep center &amp; area, change shape<br>Size: keep center, apply current W&times;H<br>Match All: copy x,y,w,h exactly',
    cropData: 'Crop Data',
    exportJson: 'Export Rects (JSON)', importJson: 'Import Rects (JSON)',
    allFigs: 'All Figs', suffix: 'Suffix',
    saveCropped: 'Save Cropped Images', saving: 'Saving…', buildingZip: 'Building ZIP…',
    saveNoteFolder: 'Will write files directly to a chosen folder.',
    saveNoteZip: 'Safari/Firefox: will download a .zip file.',
    savedN: 'Saved {n} image(s).',
    jszipFailed: 'JSZip failed to load. Check your internet connection.',
    invalidJson: 'Invalid JSON file.',
    toastUndone: 'Undone', toastCenters: 'Centers aligned',
    toastAspect: 'Aspect ratios aligned', toastSize: 'Sizes aligned',
    toastMatch: 'All rects matched',
    allFigsHead: 'All Figures — click to navigate',
    help:
      '<h3>How to use</h3>' +
      '<ol>' +
      '<li>Click <strong>Load Images</strong> or drag &amp; drop image files anywhere on the page (several at once is fine).</li>' +
      '<li>The red rectangle is the crop area. Drag inside it to move it, drag a corner to resize it, ' +
      'or type values in X / Y / W / H.</li>' +
      '<li>Each image has <strong>its own rectangle</strong>. Switch images with ◀ / ▶ (or the ← / → keys). ' +
      '<strong>All Figs</strong> shows every image; click one to go to it.</li>' +
      '<li><strong>Align to Current Image</strong> makes every rectangle follow the current one ' +
      '(centers / aspect ratio / size / match all).</li>' +
      '<li><strong>Save Cropped Images</strong> writes the results: straight to a chosen folder in Chrome / Edge, ' +
      'as a .zip download in Safari / Firefox. File names get the suffix (default <code>_cropped</code>).</li>' +
      '</ol>' +
      '<p><strong>Crop Data</strong> exports and imports the rectangles as JSON (matched by file name).</p>' +
      '<h3>Keyboard shortcuts</h3>' +
      '<table class="help-keys">' +
      '<tr><td><kbd>←</kbd> / <kbd>→</kbd></td><td>Previous / next image</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + <kbd>Z</kbd></td><td>Undo</td></tr>' +
      '<tr><td><kbd>F</kbd></td><td>Toggle full screen</td></tr>' +
      '<tr><td><kbd>?</kbd></td><td>Open this help</td></tr>' +
      '<tr><td><kbd>Esc</kbd></td><td>Close the open window</td></tr>' +
      '</table>' +
      '<h3>Crop rectangle</h3>' +
      '<table class="help-keys">' +
      '<tr><td>Drag inside the rectangle</td><td>Move it</td></tr>' +
      '<tr><td>Drag a corner</td><td>Resize it</td></tr>' +
      '<tr><td><kbd>Shift</kbd> + resize</td><td>Lock the aspect ratio</td></tr>' +
      '<tr><td><kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + resize</td><td>Resize from the center</td></tr>' +
      '<tr><td><kbd>Shift</kbd> + move</td><td>Move along H or V only</td></tr>' +
      '</table>' +
      '<h3>Zoom &amp; pan</h3>' +
      '<table class="help-keys">' +
      '<tr><td><kbd>Ctrl</kbd> / <kbd>Cmd</kbd> + scroll</td><td>Zoom in / out</td></tr>' +
      '<tr><td>Scroll</td><td>Pan</td></tr>' +
      '<tr><td>Double-click the canvas</td><td>Reset zoom &amp; pan</td></tr>' +
      '</table>' +
      '<h3>iPad / touch</h3>' +
      '<table class="help-keys">' +
      '<tr><td>One-finger drag</td><td>Move / resize the rectangle</td></tr>' +
      '<tr><td>Pinch</td><td>Zoom in / out</td></tr>' +
      '</table>' +
      '<p class="note">In Safari (iPad / iPhone) saving downloads a .zip file.</p>' +
      '<p class="note">Images are processed only in this browser and never sent to a server.</p>',
  },
};

const t = (key, params) => I18N.t(key, params);

// Before anything is rendered: markup and JS-built labels use the language.
I18N.init(LANG_KEY, STRINGS);

// ── State ─────────────────────────────────────────────────────────────────────

const images = [];  // [{file, img, rect:{x,y,w,h}, undoStack:[]}]
let idx = 0;

let dispScale = 1;
let dispOx = 0;
let dispOy = 0;

let drag = null;         // {mode, sx, sy, rect0}
let preDragRect = null;  // snapshot before drag (for undo on mouseup)

let zoom      = 1.0;
let panX      = 0;
let panY      = 0;
let baseScale = 1;

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
const toast      = document.getElementById('toast');

const appVersion = document.getElementById('appVersion');
const btnQr      = document.getElementById('qrBtn');
const qrOverlay  = document.getElementById('qr-overlay');
const qrClose    = document.getElementById('qr-close');
const qrAppUrl   = document.getElementById('qr-app-url');
const qrSrcUrl   = document.getElementById('qr-src-url');

const secJson          = document.getElementById('sec-json');
const btnExportJson    = document.getElementById('btn-export-json');
const btnImportJson    = document.getElementById('btn-import-json');
const jsonInput        = document.getElementById('json-input');
const btnFullscreen    = document.getElementById('fullscreen-btn');
const helpBtn          = document.getElementById('help-btn');
const helpOverlay      = document.getElementById('helpOverlay');
const helpClose        = document.getElementById('helpClose');
const feedbackBtn      = document.getElementById('feedback-btn');
const feedbackOverlay  = document.getElementById('feedbackOverlay');
const feedbackForm     = document.getElementById('feedbackForm');
const feedbackMessage  = document.getElementById('feedbackMessage');
const feedbackContact  = document.getElementById('feedbackContact');
const feedbackWebsite  = document.getElementById('feedbackWebsite');
const feedbackStatus   = document.getElementById('feedbackStatus');
const feedbackSend     = document.getElementById('feedbackSend');
const feedbackClose    = document.getElementById('feedbackClose');

const settingsBtn      = document.getElementById('settings-btn');
const settingsPanel    = document.getElementById('settings-panel');
const settingsClose    = document.getElementById('settings-close');
const sheetBackdrop    = document.getElementById('sheet-backdrop');
const langSelect       = document.getElementById('lang-select');
const changelogBtn     = document.getElementById('changelogBtn');
const changelogOverlay = document.getElementById('changelogOverlay');
const changelogList    = document.getElementById('changelogList');
const changelogClose   = document.getElementById('changelogClose');

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
    resetView();
    showPanels();
    redraw();
    syncSpins();
  });
}

function showPanels() {
  [secNav, secRect, secModhint, secUndo, secAlign, secJson, secSave]
    .forEach(el => el.style.display = '');
  updateSaveNote();
}

function updateSaveNote() {
  saveNote.textContent = ('showDirectoryPicker' in window)
    ? t('saveNoteFolder')
    : t('saveNoteZip');
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
  baseScale = Math.min(cw / iw, ch / ih);
  dispScale = baseScale * zoom;
  dispOx    = Math.floor((cw - iw * dispScale) / 2 + panX);
  dispOy    = Math.floor((ch - ih * dispScale) / 2 + panY);
}

function resetView() {
  zoom = 1.0;
  panX = 0;
  panY = 0;
}

// ── Toast notification ────────────────────────────────────────────────────────

let toastTimer = null;

function showToast(msg, ms = 2000) {
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), ms);
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
  showToast(t('toastUndone'));
});

document.addEventListener('keydown', e => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
    e.preventDefault();
    btnUndo.click();
    return;
  }
  if (e.key === 'Escape') {
    if (!settingsPanel.hidden || !qrOverlay.hidden || !changelogOverlay.hidden || !helpOverlay.hidden ||
        !feedbackOverlay.hidden) {
      setSettingsOpen(false);
      qrOverlay.hidden = true;
      changelogOverlay.hidden = true;
      helpOverlay.hidden = true;
      feedbackOverlay.hidden = true;
      return;
    }
  }
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
  if (e.key === 'f' || e.key === 'F')  { e.preventDefault(); toggleFullscreen(); return; }
  if (e.key === '?')                    { e.preventDefault(); openHelp(); return; }
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
  showToast(t('toastCenters'));
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
  showToast(t('toastAspect'));
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
  showToast(t('toastSize'));
});

document.getElementById('btn-match').addEventListener('click', () => {
  const { x: tx, y: ty, w: tw, h: th } = images[idx].rect;
  images.forEach((entry, i) => {
    if (i === idx) return;
    entry.rect = clampRect(tx, ty, tw, th,
      entry.img.naturalWidth, entry.img.naturalHeight);
  });
  redraw();
  showToast(t('toastMatch'));
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
    btnSave.textContent = t('saving');
    try {
      for (const entry of images) {
        const blob = await cropBlob(entry);
        const fh   = await dirHandle.getFileHandle(outFilename(entry), { create: true });
        const wr   = await fh.createWritable();
        await wr.write(blob);
        await wr.close();
      }
      alert(t('savedN', { n: images.length }));
    } finally {
      btnSave.disabled = false;
      btnSave.textContent = t('saveCropped');
    }

  } else {
    // ZIP fallback — Safari / Firefox
    if (typeof JSZip === 'undefined') {
      alert(t('jszipFailed'));
      return;
    }
    btnSave.disabled = true;
    btnSave.textContent = t('buildingZip');
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
      btnSave.textContent = t('saveCropped');
    }
  }
});

// ── Settings sheet ────────────────────────────────────────────────────────────

function setSettingsOpen(open) {
  settingsPanel.hidden = !open;
  sheetBackdrop.hidden = !open;
  settingsBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
}

settingsBtn.addEventListener('click', () => setSettingsOpen(settingsPanel.hidden));
settingsClose.addEventListener('click', () => setSettingsOpen(false));
sheetBackdrop.addEventListener('click', () => setSettingsOpen(false));

langSelect.value = I18N.lang();
langSelect.addEventListener('change', () => I18N.set(langSelect.value));

// ── Version & QR ─────────────────────────────────────────────────────────────

appVersion.textContent = `v${APP_VERSION}`;
appVersion.addEventListener('click', openChangelog);

// The QR images encode these strings; print the same constants so the two
// cannot drift apart when one of them is edited.
qrAppUrl.textContent = APP_URL;
qrSrcUrl.textContent = SRC_URL;
document.getElementById('qr-app-link').href = APP_URL;
document.getElementById('qr-src-link').href = SRC_URL;

btnQr.addEventListener('click', () => {
  setSettingsOpen(false);
  qrOverlay.hidden = false;
});
qrClose.addEventListener('click', () => { qrOverlay.hidden = true; });
qrOverlay.addEventListener('click', e => { if (e.target === qrOverlay) qrOverlay.hidden = true; });

// ── Changelog ─────────────────────────────────────────────────────────────────

function readSeenVersion() {
  try { return localStorage.getItem(SEEN_VERSION_KEY); } catch { return null; }
}

function writeSeenVersion() {
  try { localStorage.setItem(SEEN_VERSION_KEY, APP_VERSION); } catch { /* ignore */ }
}

/** First visit ever: nothing is "new", so record the version quietly. A user
 *  who already had this app's data but no seen-version is upgrading, and gets
 *  the mark. Any key under the app prefix (other than seen-version) counts. */
function initSeenVersion() {
  if (readSeenVersion() !== null) return;
  let hadData = false;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX) && key !== SEEN_VERSION_KEY) { hadData = true; break; }
    }
  } catch { /* ignore */ }
  if (!hadData) writeSeenVersion();
}

function syncNewsMark() {
  const hasNews = readSeenVersion() !== APP_VERSION;
  settingsBtn.classList.toggle('has-news', hasNews);
  changelogBtn.classList.toggle('has-news', hasNews);
}

function buildChangelog() {
  changelogList.textContent = '';
  for (const entry of CHANGELOG) {
    const section = document.createElement('section');
    section.className = 'changelog-entry';
    const head = document.createElement('h3');
    head.className = 'changelog-version';
    head.textContent = `v${entry.version} (${entry.date})`;
    section.appendChild(head);
    const list = document.createElement('ul');
    for (const item of entry.items) {
      const li = document.createElement('li');
      li.textContent = item[I18N.lang()] || item.ja;
      list.appendChild(li);
    }
    section.appendChild(list);
    changelogList.appendChild(section);
  }
}

function openChangelog() {
  setSettingsOpen(false);
  changelogOverlay.hidden = false;
  if (changelogList.scrollTop) changelogList.scrollTop = 0;
  writeSeenVersion();
  syncNewsMark();
}

initSeenVersion();
buildChangelog();
syncNewsMark();
changelogBtn.addEventListener('click', openChangelog);
changelogClose.addEventListener('click', () => { changelogOverlay.hidden = true; });
changelogOverlay.addEventListener('click', e => {
  if (e.target === changelogOverlay) changelogOverlay.hidden = true;
});

// ── Language ──────────────────────────────────────────────────────────────────

/** Text that is built in JS rather than marked up with data-i18n. */
function applyLanguage() {
  langSelect.value = I18N.lang();
  updateSaveNote();
  if (!btnSave.disabled) btnSave.textContent = t('saveCropped');
  syncFullscreenBtn();
  buildChangelog();
}

I18N.onChange(applyLanguage);
applyLanguage();

// ── Zoom & Pan ────────────────────────────────────────────────────────────────

canvas.addEventListener('wheel', e => {
  if (!images.length) return;
  e.preventDefault();
  const { ex, ey } = canvasPos(e);
  if (e.ctrlKey || e.metaKey) {
    const factor   = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    const newZoom  = Math.max(0.25, Math.min(16, zoom * factor));
    const img      = images[idx].img;
    const newScale = baseScale * newZoom;
    panX = ex - ((ex - dispOx) / dispScale) * newScale - (canvas.width  - img.naturalWidth  * newScale) / 2;
    panY = ey - ((ey - dispOy) / dispScale) * newScale - (canvas.height - img.naturalHeight * newScale) / 2;
    zoom = newZoom;
  } else {
    panX -= e.deltaX;
    panY -= e.deltaY;
  }
  redraw();
}, { passive: false });

canvas.addEventListener('dblclick', () => {
  if (!images.length) return;
  resetView();
  redraw();
});

// ── Fullscreen ────────────────────────────────────────────────────────────────

/** ⛶ (and the F key) toggle full screen. Hidden where the browser cannot do it (iPhone). */
function fullscreenElement() {
  return document.fullscreenElement || document.webkitFullscreenElement || null;
}

function toggleFullscreen() {
  const root = document.documentElement;
  if (fullscreenElement()) {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (exit) {
      const p = exit.call(document);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  } else {
    const req = root.requestFullscreen || root.webkitRequestFullscreen;
    if (req) {
      const p = req.call(root);
      if (p && typeof p.catch === 'function') p.catch(() => {});
    }
  }
}

/** Swap the icon and label so the button shows what a press will do
 * (expand when windowed, shrink while full screen). Also runs when the user
 * leaves full screen with Esc, which never touches the button. */
function syncFullscreenBtn() {
  const on = !!fullscreenElement();
  const label = t(on ? 'c.exitFullscreen' : 'c.fullscreen');
  btnFullscreen.classList.toggle('is-fullscreen', on);
  btnFullscreen.title = label;
  btnFullscreen.setAttribute('aria-label', label);
}

function initFullscreen() {
  const root = document.documentElement;
  btnFullscreen.hidden = !(root.requestFullscreen || root.webkitRequestFullscreen);
  btnFullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', syncFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', syncFullscreenBtn);
  syncFullscreenBtn();
}

initFullscreen();

// ── JSON export / import ──────────────────────────────────────────────────────

btnExportJson.addEventListener('click', () => {
  if (!images.length) return;
  const data = images.map(e => ({ filename: e.file.name, rect: { ...e.rect } }));
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'crop-rects.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

btnImportJson.addEventListener('click', () => jsonInput.click());

jsonInput.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!Array.isArray(data)) throw new Error('Expected array');
      data.forEach(item => {
        const entry = images.find(en => en.file.name === item.filename);
        if (!entry || !item.rect) return;
        const i = images.indexOf(entry);
        pushUndo(i, { ...entry.rect });
        const { x, y, w, h } = item.rect;
        entry.rect = clampRect(x, y, w, h, entry.img.naturalWidth, entry.img.naturalHeight);
      });
      syncSpins();
      redraw();
    } catch {
      alert(t('invalidJson'));
    }
    jsonInput.value = '';
  };
  reader.readAsText(file);
});

// ── How to use ─────────────────────────────────────────────────────────────

/** The "How to use" window, opened by the ? button at the top of the sidebar or the ? key. */
function openHelp() {
  setSettingsOpen(false);
  qrOverlay.hidden = true;
  changelogOverlay.hidden = true;
  feedbackOverlay.hidden = true;
  helpOverlay.hidden = false;
  const body = helpOverlay.querySelector('.help-body');
  if (body.scrollTop) body.scrollTop = 0;
}

helpBtn.addEventListener('click', openHelp);
helpClose.addEventListener('click', () => { helpOverlay.hidden = true; });
helpOverlay.addEventListener('click', e => {
  if (e.target === helpOverlay) helpOverlay.hidden = true;
});

// ── Feedback ──────────────────────────────────────────────────────────────────

/** The feedback window, opened by the FB button at the top of the sidebar. */
function openFeedback() {
  setSettingsOpen(false);
  qrOverlay.hidden = true;
  changelogOverlay.hidden = true;
  helpOverlay.hidden = true;
  feedbackStatus.textContent = '';
  feedbackStatus.className = 'feedback-status';
  feedbackOverlay.hidden = false;
  feedbackMessage.focus();
}

function setFeedbackStatus(key, kind) {
  feedbackStatus.textContent = t(key);
  feedbackStatus.className = 'feedback-status' + (kind ? ' ' + kind : '');
}

/** Post the message to the shared GAS endpoint. Sent as text/plain so the
 *  browser makes a "simple" request: GAS cannot answer a CORS preflight. */
function sendFeedback(e) {
  e.preventDefault();
  const message = feedbackMessage.value.trim();
  if (!message) { setFeedbackStatus('c.feedbackEmpty', 'err'); return; }
  feedbackSend.disabled = true;
  setFeedbackStatus('c.feedbackSending', '');
  fetch(FEEDBACK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({
      app: APP_ID, version: APP_VERSION, lang: I18N.lang(), message,
      contact: feedbackContact.value.trim(), website: feedbackWebsite.value,
    }),
  }).then(res => res.json()).then(res => {
    if (!res || !res.ok) throw new Error(res && res.error);
    feedbackMessage.value = '';
    feedbackContact.value = '';
    setFeedbackStatus('c.feedbackThanks', 'ok');
  }).catch(() => {
    setFeedbackStatus('c.feedbackError', 'err');
  }).then(() => {
    feedbackSend.disabled = false;
  });
}

feedbackBtn.addEventListener('click', openFeedback);
feedbackForm.addEventListener('submit', sendFeedback);
feedbackClose.addEventListener('click', () => { feedbackOverlay.hidden = true; });
feedbackOverlay.addEventListener('click', e => {
  if (e.target === feedbackOverlay) feedbackOverlay.hidden = true;
});
// Esc closes it from inside the fields too. The global handler already checks Esc
// before it skips keys typed into fields; this keeps it working if that order changes.
feedbackOverlay.addEventListener('keydown', e => {
  if (e.key === 'Escape') feedbackOverlay.hidden = true;
});

// ── Touch support ─────────────────────────────────────────────────────────────

let touchStartDist = null;
let touchStartZoom = null;

function touchCanvasPos(touch) {
  const r = canvas.getBoundingClientRect();
  return { ex: touch.clientX - r.left, ey: touch.clientY - r.top };
}

function pinchDist(e) {
  return Math.hypot(
    e.touches[1].clientX - e.touches[0].clientX,
    e.touches[1].clientY - e.touches[0].clientY,
  );
}

canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  if (!images.length) return;
  if (e.touches.length === 1) {
    const { ex, ey } = touchCanvasPos(e.touches[0]);
    const corner = hitCorner(ex, ey);
    preDragRect = { ...images[idx].rect };
    if (corner) {
      drag = { mode: 'resize_' + corner, sx: ex, sy: ey, rect0: preDragRect };
    } else if (hitBody(ex, ey)) {
      drag = { mode: 'move', sx: ex, sy: ey, rect0: preDragRect };
    } else {
      drag = null; preDragRect = null;
    }
  } else if (e.touches.length === 2) {
    drag = null; preDragRect = null;
    touchStartDist = pinchDist(e);
    touchStartZoom = zoom;
  }
}, { passive: false });

canvas.addEventListener('touchmove', e => {
  e.preventDefault();
  if (!images.length) return;

  if (e.touches.length === 2) {
    const dist    = pinchDist(e);
    const newZoom = Math.max(0.25, Math.min(16, touchStartZoom * dist / touchStartDist));
    const r       = canvas.getBoundingClientRect();
    const mx      = (e.touches[0].clientX + e.touches[1].clientX) / 2 - r.left;
    const my      = (e.touches[0].clientY + e.touches[1].clientY) / 2 - r.top;
    const img     = images[idx].img;
    const newScale = baseScale * newZoom;
    panX = mx - ((mx - dispOx) / dispScale) * newScale - (canvas.width  - img.naturalWidth  * newScale) / 2;
    panY = my - ((my - dispOy) / dispScale) * newScale - (canvas.height - img.naturalHeight * newScale) / 2;
    zoom = newZoom;
    redraw();
    return;
  }

  if (!drag || e.touches.length !== 1) return;
  const { ex, ey } = touchCanvasPos(e.touches[0]);
  const s  = dispScale;
  const dx = (ex - drag.sx) / s;
  const dy = (ey - drag.sy) / s;
  const { x: x0, y: y0, w: w0, h: h0 } = drag.rect0;
  const entry = images[idx];
  const iw = entry.img.naturalWidth, ih = entry.img.naturalHeight;

  let newRect;
  if (drag.mode === 'move') {
    newRect = clampRect(x0 + dx, y0 + dy, w0, h0, iw, ih);
  } else {
    const cid  = drag.mode.slice(7);
    const sgnW = (cid === 'tr' || cid === 'br') ?  1 : -1;
    const sgnH = (cid === 'bl' || cid === 'br') ?  1 : -1;
    let nw = Math.max(1, Math.round(w0 + sgnW * dx));
    let nh = Math.max(1, Math.round(h0 + sgnH * dy));
    let nx, ny;
    if      (cid === 'br') { nx = x0;           ny = y0;           }
    else if (cid === 'tl') { nx = x0 + w0 - nw; ny = y0 + h0 - nh; }
    else if (cid === 'tr') { nx = x0;            ny = y0 + h0 - nh; }
    else                   { nx = x0 + w0 - nw;  ny = y0;           }
    newRect = clampRect(nx, ny, nw, nh, iw, ih);
  }
  entry.rect = newRect;
  syncSpins();
  redraw();
}, { passive: false });

canvas.addEventListener('touchend', e => {
  e.preventDefault();
  if (drag && preDragRect) {
    const r = images[idx].rect, p = preDragRect;
    if (r.x !== p.x || r.y !== p.y || r.w !== p.w || r.h !== p.h) pushUndo(idx, p);
  }
  drag = null; preDragRect = null;
  if (e.touches.length === 0) { touchStartDist = null; touchStartZoom = null; }
}, { passive: false });
