// Loads i18n.js + main.js into a Node vm with a stub DOM, so the pure logic
// can be tested without a browser. The app files are not modified: a small
// export line is appended to main.js's source only inside the sandbox.
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..');

// An object that absorbs any property access or call, and records listeners.
function stub(name) {
  const listeners = {};
  const store = {
    _name: name, _listeners: listeners,
    style: {}, dataset: {}, value: '', textContent: '', innerHTML: '',
    classList: { add() {}, remove() {}, toggle() {}, contains() { return false; } },
    addEventListener(type, fn) { listeners[type] = fn; },
    removeEventListener() {},
    getContext() { return stub(name + '.ctx'); },
    getBoundingClientRect() { return { left: 0, top: 0, width: 800, height: 600 }; },
    querySelectorAll() { return []; },
    querySelector() { return stub(name + '.q'); },
    appendChild(c) { return c; },
    setAttribute() {}, getAttribute() { return null; }, removeAttribute() {},
    click() { if (listeners.click) listeners.click({ preventDefault() {} }); },
  };
  const fn = function () { return stub(name + '()'); };
  return new Proxy(fn, {
    get(_t, k) {
      if (k in store) return store[k];
      if (k === Symbol.toPrimitive) return () => '';
      return stub(name + '.' + String(k));
    },
    set(_t, k, v) { store[k] = v; return true; },
    apply() { return stub(name + '()'); },
  });
}

function load() {
  const elements = {};
  const local = new Map();
  const document = stub('document');
  const docStore = {
    getElementById(id) { return elements[id] || (elements[id] = stub('#' + id)); },
    createElement(tag) { return stub('<' + tag + '>'); },
    documentElement: stub('html'),
    activeElement: { tagName: 'BODY' },
    addEventListener() {}, querySelectorAll() { return []; }, querySelector() { return stub('q'); },
    body: stub('body'),
  };
  const doc = new Proxy({}, { get: (_t, k) => (k in docStore ? docStore[k] : document[k]) });
  const ctx = {
    document: doc,
    navigator: { language: 'en' },
    localStorage: {
      getItem: k => (local.has(k) ? local.get(k) : null),
      setItem: (k, v) => local.set(k, String(v)),
      removeItem: k => local.delete(k),
      key: i => [...local.keys()][i] ?? null,
      get length() { return local.size; },
    },
    console, Math, JSON, Promise, setTimeout, clearTimeout,
    requestAnimationFrame: () => 0,
    matchMedia: () => ({ matches: false, addEventListener() {} }),
    addEventListener() {},
    location: { reload() {} },
    Image: function () { return stub('img'); },
    ResizeObserver: function () { return { observe() {}, disconnect() {} }; },
  };
  ctx.window = ctx;
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'i18n.js'), 'utf8'), ctx, { filename: 'i18n.js' });
  const src = fs.readFileSync(path.join(ROOT, 'main.js'), 'utf8') +
    '\n;globalThis.__app = { APP_VERSION, CHANGELOG, STRINGS, clampRect, placeCentered, constrainAspect,' +
    ' bestGrid, outFilename, images, suffix, setIdx(v) { idx = v; } };\n';
  vm.runInContext(src, ctx, { filename: 'main.js' });
  return { app: ctx.__app, el: id => docStore.getElementById(id) };
}

module.exports = { load };
