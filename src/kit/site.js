// Real cutcod.com pages (public/site, mirrored + film-shim.js) mounted in iframes at 1440×900.
// The film moves a camera over the iframe, draws cursor/highlights in site pixels, and drives the
// page with real clicks and input events. Every function here is a pure function of shot-local time.
import {frame} from '../engine.js';

export const SITE_W = 1440, SITE_H = 900, W = 1920, H = 1080;
export const sec = id => document.querySelector(`section[data-shot="${id}"]`);
export const ifr = id => sec(id)?.querySelector('iframe.site');
export const sdoc = id => ifr(id)?.contentDocument;
export const swin = id => ifr(id)?.contentWindow;

export const ease = {
  inOut: x => (x < 0.5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2),
  out: x => 1 - (1 - x) ** 4,
  in: x => x ** 3,
  lin: x => x,
};
/** keys [{at, ...numbers, ease?}] → interpolated numbers at `t`. Each key's ease shapes the segment into it. */
export function interp(keys, t) {
  if (t <= keys[0].at) return keys[0];
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i], b = keys[i + 1];
    if (t < b.at) {
      const u = (ease[b.ease] || ease.inOut)((t - a.at) / (b.at - a.at)), o = {};
      for (const k in b) if (typeof b[k] === 'number' && typeof a[k] === 'number') o[k] = a[k] + (b[k] - a[k]) * u;
      return o;
    }
  }
  return keys[keys.length - 1];
}
/** Camera: focus point (x,y in site px) lands at frame centre at scale s; clamp so the page fills the frame. */
export function camTransform({x, y, s}) {
  let tx = W / 2 - x * s, ty = H / 2 - y * s;
  const cw = SITE_W * s, ch = SITE_H * s;
  tx = cw >= W ? Math.min(0, Math.max(W - cw, tx)) : (W - cw) / 2;
  ty = ch >= H ? Math.min(0, Math.max(H - ch, ty)) : (H - ch) / 2;
  return {tx, ty, s};
}
export const rectIn = (doc, sel) => {
  const e = typeof sel === 'string' ? doc?.querySelector(sel) : sel;
  if (!e) return null;
  const r = e.getBoundingClientRect();
  return r.width || r.height ? r : null;
};
/** Rect of `needle` inside element `sel` (for highlighter marks on real site copy). */
export function textRect(doc, sel, needle) {
  const el = doc?.querySelector(sel);
  if (!el) return null;
  const walker = doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  for (let n; (n = walker.nextNode());) {
    const i = n.data.indexOf(needle);
    if (i < 0) continue;
    const r = doc.createRange(); r.setStart(n, i); r.setEnd(n, i + needle.length);
    return r.getBoundingClientRect();
  }
  return null;
}
/** Cursor key {at, sel | x,y, dx?, dy?} → point in site px (measured live). */
function keyPoint(doc, k) {
  if (k.sel) { const r = rectIn(doc, k.sel); if (r) return {x: r.left + r.width / 2 + (k.dx || 0), y: r.top + r.height / 2 + (k.dy || 0)}; }
  return {x: k.x ?? SITE_W / 2, y: k.y ?? SITE_H / 2};
}
export function paintSiteCursor(el, doc, local, keys, clicks, camScale, show = [-1, 1e9]) {
  const vis = local >= show[0] && local < show[1];
  el.style.opacity = vis ? '1' : '0';
  if (!vis) return;
  const pts = keys.map(k => ({at: k.at, ...keyPoint(doc, k), ease: k.ease}));
  const p = interp(pts, local);
  const since = clicks.map(c => local - c).filter(d => d >= 0 && d < 0.5)[0];
  const press = since !== undefined && since < 0.16 ? 0.82 + 0.18 * since / 0.16 : 1;
  el.style.transform = `translate(${p.x}px, ${p.y}px) scale(${1 / camScale})`;
  el.querySelector('svg').style.transform = `scale(${press})`;
  const r = el.querySelector('.film-ripple');
  r.style.opacity = since !== undefined ? String(0.9 * (1 - since / 0.5)) : '0';
  r.style.transform = `scale(${since !== undefined ? 0.5 + since * 3.2 : 0.5})`;
}
/** Wait for an iframe page (re)load and the shim's __siteReady. */
export async function siteReady(iframe) {
  const w = iframe.contentWindow;
  if (!w || !w.__siteReady || w.document.readyState !== 'complete') await new Promise(r => iframe.addEventListener('load', r, {once: true}));
  await iframe.contentWindow.__siteReady;
  await settle(iframe.contentWindow);
}
/** Let the site's own layout (masonry rAF + short timers) and poster images settle. */
export async function settle(w, ms = 260) {
  await new Promise(r => w.requestAnimationFrame(() => r()));
  await new Promise(r => setTimeout(r, ms));
  await Promise.all([...w.document.querySelectorAll('video[poster]')].slice(0, 30).map(v => new Promise(res => {
    const im = new Image(); im.onload = im.onerror = () => res(); im.src = v.poster; if (im.complete) res();
  })));
  await frame();
}
/** Set an input value via the iframe's own setter and fire `input` (what the site listens to). */
export function setInput(w, el, value) {
  if (!el || el.value === value) return;
  Object.getOwnPropertyDescriptor(w.HTMLInputElement.prototype, 'value').set.call(el, value);
  el.dispatchEvent(new w.Event('input', {bubbles: true}));
}

// ---- film-driven video frames (decoded JPEG sequences from public/clips/<name>/0001.jpg) ----
const cache = new Map();
export function clipFrame(name, i) {
  const key = name + i;
  if (!cache.has(key)) {
    const img = new Image();
    img.src = `clips/${name}/${String(i + 1).padStart(4, '0')}.jpg`;
    cache.set(key, img.decode().then(() => img, () => null));
  }
  return cache.get(key);
}
export const CLIP_LEN = {uimorph: 255, guizang: 210, liquid: 240, higgs: 240};
export const clipIndex = (name, t, fps = 30) => Math.max(0, Math.floor(t * fps)) % CLIP_LEN[name];
