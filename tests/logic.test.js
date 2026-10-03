// Pure-logic tests for batch-image-cropper. Run from the repo root: node --test
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./harness');

const { app, el } = load();

const img = (w, h) => ({ naturalWidth: w, naturalHeight: h });
function setImages(list, current) {
  app.images.length = 0;
  for (const [w, h, rect, name] of list) {
    app.images.push({ file: { name: name || 'a.png', type: 'image/png' }, img: img(w, h), rect: { ...rect }, undoStack: [] });
  }
  app.setIdx(current);
}

test('clampRect keeps the rect inside the image and rounds', () => {
  assert.deepEqual({ ...app.clampRect(-5, -5, 50, 50, 100, 80) }, { x: 0, y: 0, w: 50, h: 50 });
  assert.deepEqual({ ...app.clampRect(90, 70, 50, 50, 100, 80) }, { x: 50, y: 30, w: 50, h: 50 });
  assert.deepEqual({ ...app.clampRect(0, 0, 500, 500, 100, 80) }, { x: 0, y: 0, w: 100, h: 80 });
  assert.deepEqual({ ...app.clampRect(1.4, 2.6, 0, 0, 100, 80) }, { x: 1, y: 3, w: 1, h: 1 });
});

test('placeCentered centers on the point, then clamps', () => {
  assert.deepEqual({ ...app.placeCentered(50, 40, 20, 10, 100, 80) }, { x: 40, y: 35, w: 20, h: 10 });
  assert.deepEqual({ ...app.placeCentered(0, 0, 20, 10, 100, 80) }, { x: 0, y: 0, w: 20, h: 10 });
  assert.deepEqual({ ...app.placeCentered(100, 80, 20, 10, 100, 80) }, { x: 80, y: 70, w: 20, h: 10 });
});

test('constrainAspect keeps the starting aspect ratio', () => {
  const a = app.constrainAspect(200, 50, 100, 50);   // width changed more → height follows
  assert.deepEqual({ ...a }, { nw: 200, nh: 100 });
  const b = app.constrainAspect(110, 100, 100, 50);  // height changed more → width follows
  assert.deepEqual({ ...b }, { nw: 200, nh: 100 });
  assert.deepEqual({ ...app.constrainAspect(30, 40, 0, 0) }, { nw: 30, nh: 40 });
});

test('Align Centers moves the other rects onto the current center', () => {
  setImages([[200, 200, { x: 50, y: 50, w: 20, h: 20 }], [200, 200, { x: 0, y: 0, w: 40, h: 10 }]], 0);
  el('btn-centers').click();
  assert.deepEqual({ ...app.images[1].rect }, { x: 40, y: 55, w: 40, h: 10 });
  assert.deepEqual({ ...app.images[0].rect }, { x: 50, y: 50, w: 20, h: 20 });
});

test('Align Size copies width/height around each own center', () => {
  setImages([[200, 200, { x: 0, y: 0, w: 30, h: 60 }], [200, 200, { x: 90, y: 90, w: 20, h: 20 }]], 0);
  el('btn-size').click();
  assert.deepEqual({ ...app.images[1].rect }, { x: 85, y: 70, w: 30, h: 60 });
});

test('Align Aspect keeps each area and takes the current ratio', () => {
  setImages([[400, 400, { x: 0, y: 0, w: 40, h: 20 }], [400, 400, { x: 100, y: 100, w: 20, h: 20 }]], 0);
  el('btn-aspect').click();
  const r = app.images[1].rect;
  assert.equal(r.w / r.h, 2);
  assert.ok(Math.abs(r.w * r.h - 400) <= 20);
});

test('Match All copies the rect exactly, clamped to each image', () => {
  setImages([[200, 200, { x: 150, y: 150, w: 40, h: 40 }], [100, 100, { x: 0, y: 0, w: 10, h: 10 }]], 0);
  el('btn-match').click();
  assert.deepEqual({ ...app.images[1].rect }, { x: 60, y: 60, w: 40, h: 40 });
});

test('outFilename inserts the suffix before the extension', () => {
  app.suffix.value = '';
  assert.equal(app.outFilename({ file: { name: 'fig.1.png' } }), 'fig.1_cropped.png');
  assert.equal(app.outFilename({ file: { name: 'noext' } }), 'noext_cropped');
  app.suffix.value = '_c';
  assert.equal(app.outFilename({ file: { name: 'a.jpg' } }), 'a_c.jpg');
  app.suffix.value = '';
});

test('bestGrid fits every image and stays inside the area', () => {
  for (const n of [1, 2, 5, 12]) {
    const imgs = Array.from({ length: n }, () => ({ img: img(400, 300) }));
    const g = app.bestGrid(n, imgs, 1600, 900);
    assert.ok(g.cols * g.rows >= n, `n=${n}`);
    assert.ok(g.cellW > 0 && g.cellH > 0);
    assert.ok(g.cols * g.cellW + (g.cols - 1) * 8 <= 1600);
  }
});

test('CHANGELOG starts with APP_VERSION and has ja/en for every item', () => {
  assert.equal(app.CHANGELOG[0].version, app.APP_VERSION);
  for (const v of app.CHANGELOG) for (const it of v.items) assert.ok(it.ja && it.en, v.version);
});

test('STRINGS ja and en have the same keys', () => {
  const ja = Object.keys(app.STRINGS.ja).sort();
  const en = Object.keys(app.STRINGS.en).sort();
  assert.deepEqual(ja, en);
});
