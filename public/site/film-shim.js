// Film shim: loaded first in the mirrored cutcod.com pages. Makes the real site run offline and
// deterministically inside the film. It does not change the site's markup, CSS or behaviour code.
(function () {
  const FIXED = new Date('2026-10-08T10:00:00+08:00').getTime();
  const RealDate = Date;
  class FilmDate extends RealDate { constructor(...a) { a.length ? super(...a) : super(FIXED); } static now() { return FIXED; } }
  window.Date = FilmDate;
  let seed = 4242; Math.random = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
  // Long timers (toast auto-hide, idle refresh) never fire on wall-clock time; the film sets those states.
  const realTimeout = window.setTimeout.bind(window);
  window.setTimeout = (fn, ms, ...a) => (ms >= 1000 ? 0 : realTimeout(fn, ms, ...a));
  // Signed-out visitor; no CloudBase SDK in the film.
  window.CLOUD_BASE_CONFIG = {envId: 'film', publicSiteUrl: '.'};
  window.CLOUD_BASE_AUTH = {getAccessToken: async () => '', signOut: async () => ({}),
    requestEmailCode: async () => ({}), signInWithEmailCode: async () => ({})};
  const json = (d, s = 200) => new Response(JSON.stringify(d), {status: s, headers: {'Content-Type': 'application/json'}});
  let resources = null;
  const realFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input.url, location.href);
    const p = url.pathname.replace(/^.*\/api\//, '/api/');
    if (!p.startsWith('/api/')) return realFetch(input, init);
    if (p === '/api/resources') { resources ??= await (await realFetch('api/resources.json')).json(); return json(resources); }
    if (p === '/api/session') return json({user: null});
    if (p === '/api/favorites' || p === '/api/mine') return json({resources: []});
    return json({});
  };
  try { Object.defineProperty(navigator, 'clipboard', {value: {writeText: async () => {}}, configurable: true}); } catch (e) {}
  HTMLMediaElement.prototype.play = function () { return Promise.resolve(); };
  HTMLMediaElement.prototype.pause = function () {};
  HTMLMediaElement.prototype.load = function () {};
  // Freeze CSS motion: the film clock owns every state change.
  document.addEventListener('DOMContentLoaded', () => {
    const st = document.createElement('style');
    st.textContent = '*,*::before,*::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important}html{scrollbar-width:none}::-webkit-scrollbar{display:none}#modalVideo{background:#fff}';
    document.head.appendChild(st);
    document.getElementById('modalVideo')?.removeAttribute('controls');
  });
  // Film-driven "playback": draw a decoded frame over a <video> box (object-fit:cover or contain).
  window.filmFrame = (video, img, fit) => {
    if (!video) return;
    let c = video.parentElement.querySelector(':scope > canvas.film-frame');
    if (!img) { if (c) c.remove(); return; }
    if (!c) { c = document.createElement('canvas'); c.className = 'film-frame'; video.insertAdjacentElement('afterend', c); }
    const w = video.offsetWidth, h = video.offsetHeight, dpr = 2;
    Object.assign(c.style, {position: 'absolute', left: video.offsetLeft + 'px', top: video.offsetTop + 'px', width: w + 'px', height: h + 'px', zIndex: 1, borderRadius: getComputedStyle(video).borderRadius, pointerEvents: 'none'});
    if (c.width !== w * dpr) { c.width = w * dpr; c.height = h * dpr; }
    const g = c.getContext('2d'), iw = img.naturalWidth, ih = img.naturalHeight;
    const k = (fit === 'contain' ? Math.min : Math.max)(c.width / iw, c.height / ih);
    g.clearRect(0, 0, c.width, c.height);
    g.drawImage(img, (c.width - iw * k) / 2, (c.height - ih * k) / 2, iw * k, ih * k);
  };
  window.__siteReady = new Promise(res => window.addEventListener('load', () => {
    const wait = () => document.querySelector('.card, #authView, #creatorView') ? res() : realTimeout(wait, 50);
    wait();
  }));
})();
