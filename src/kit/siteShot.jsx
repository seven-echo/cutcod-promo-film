import React from 'react';
import {shot, onDrive, onRender} from '../engine.js';
import {sec, ifr, sdoc, swin, interp, camTransform, rectIn, textRect, paintSiteCursor, siteReady, settle, clipFrame, clipIndex} from './site.js';

// One shot = the real cutcod.com page in an iframe + film layers in site pixels (marks, pills,
// notes, cursor) under one camera, plus captions in frame pixels.
//   cfg.src            page inside public/site (initial state; reloaded if seeking backwards)
//   cfg.cam            [{at, x, y, s, ease?}]  camera focus (site px) and scale
//   cfg.cursor         {keys:[{at, sel|x,y, dx?, dy?}], clicks:[t], show:[from,to]}
//   cfg.steps          [{at, run(win, doc) => void|Promise}]  real interactions, applied in order
//   cfg.frames         [{sel, clip, from, to, t0, fit}]  film-driven video playback inside a <video> box
//   cfg.marks          [{id, sel, text, from, to}]  highlighter on real site copy
//   cfg.pills          [{id, sel, from, to}]  yellow halo behind a real control
//   cfg.notes          [{id, x, y, from, to, el}] extra film callouts in site px
//   cfg.captions       [{id, at, out, tag, zh, side?}]
export function siteShot(id, cfg) {
  function View() {
    return <div className="stage">
      <div className="cam" data-cam>
        <iframe className="site" src={'site/' + cfg.src} title={id} scrolling="no" />
        <div className="cam-overlay">
          {(cfg.pills || []).map(p => <i key={p.id} className="site-pill" data-pill={p.id} />)}
          {(cfg.marks || []).map(m => <i key={m.id} className="site-mark" data-mark={m.id} />)}
          {(cfg.notes || []).map(n => <div key={n.id} className="site-note" data-note={n.id} style={{left: n.x, top: n.y}}>{n.el}</div>)}
          <div className="site-cursor" data-cursor>
            <svg viewBox="0 0 24 24" width="30" height="30"><path d="M5 2.5v17.2l4.6-4.3 2.9 6.6 2.8-1.2-2.8-6.5h6.3z" fill="#171717" stroke="#fff" strokeWidth="1.4" strokeLinejoin="round" /></svg>
            <i className="film-ripple" />
          </div>
        </div>
      </div>
      {(cfg.captions || []).map(c => <Caption key={c.id} c={c} />)}
      {cfg.extra}
    </div>;
  }
  function build(tl) {
    const s = shot(id), root = sec(id), at = t => s.start + t;
    tl.fromTo(root, {opacity: 0}, {opacity: 1, duration: cfg.fadeIn ?? 0.01, ease: 'none'}, at(cfg.inAt ?? 0));
    for (const c of cfg.captions || []) {
      const el = root.querySelector(`[data-caption="${c.id}"]`);
      tl.fromTo(el, {opacity: 0, y: 46, clipPath: 'inset(0 0 100% 0 round 22px)'}, {opacity: 1, y: 0, clipPath: 'inset(0 0 0% 0 round 22px)', duration: 0.55, ease: 'expo.out'}, at(c.at));
      tl.fromTo(el.querySelectorAll('.cap-zh .u'), {opacity: 0, y: 14}, {opacity: 1, y: 0, duration: 0.4, stagger: 0.012, ease: 'power3.out'}, at(c.at + 0.12));
      if (c.out != null) tl.to(el, {opacity: 0, y: 24, duration: 0.3, ease: 'power2.in'}, at(c.out));
    }
    for (const m of cfg.marks || []) {
      const el = root.querySelector(`[data-mark="${m.id}"]`);
      tl.fromTo(el, {scaleX: 0, opacity: 1}, {scaleX: 1, duration: 0.45, ease: 'power2.out'}, at(m.from));
      if (m.to != null) tl.to(el, {opacity: 0, duration: 0.3}, at(m.to));
    }
    for (const p of cfg.pills || []) {
      const el = root.querySelector(`[data-pill="${p.id}"]`);
      tl.fromTo(el, {scale: 0.6, opacity: 0}, {scale: 1, opacity: 1, duration: 0.35, ease: 'back.out(1.6)'}, at(p.from));
      if (p.to != null) tl.to(el, {opacity: 0, duration: 0.25}, at(p.to));
    }
    for (const n of cfg.notes || []) {
      const el = root.querySelector(`[data-note="${n.id}"]`);
      tl.fromTo(el, {opacity: 0, y: 18, scale: 0.94}, {opacity: 1, y: 0, scale: 1, duration: 0.5, ease: 'expo.out'}, at(n.from));
      if (n.to != null) tl.to(el, {opacity: 0, duration: 0.25}, at(n.to));
    }
    cfg.build?.(tl, root, at);

    // Real interactions: forward-only state machine; seeking backwards reloads the page first.
    let applied = 0, busy = Promise.resolve();
    const steps = cfg.steps || [];
    onDrive(id, local => (busy = busy.then(async () => {
      const iframe = ifr(id);
      const want = steps.filter(st => local >= st.at).length;
      if (want < applied) {
        const loaded = new Promise(r => iframe.addEventListener('load', r, {once: true}));
        iframe.contentWindow.location.replace(iframe.contentWindow.location.pathname.replace(/[^/]*$/, '') + cfg.src);
        await loaded; await siteReady(iframe); applied = 0;
      }
      while (applied < want) {
        const w = swin(id);
        await steps[applied].run(w, w.document);
        applied++;
        await settle(swin(id), steps[applied - 1].settle ?? 120);
      }
      // Film-driven playback for <video> boxes of the real cards / modal.
      const doc = sdoc(id);
      for (const f of cfg.frames || []) {
        const video = doc.querySelector(f.sel);
        const on = local >= f.from && local < f.to && video;
        if (!on) { if (video) swin(id).filmFrame(video, null); continue; }
        const img = await clipFrame(f.clip, clipIndex(f.clip, local - f.from + (f.t0 || 0)));
        swin(id).filmFrame(video, img, f.fit);
      }
    })));

    onRender(id, local => {
      const root = sec(id), doc = sdoc(id);
      if (!doc) return;
      const cam = interp(cfg.cam, local), T = camTransform(cam);
      root.querySelector('[data-cam]').style.transform = `translate(${T.tx}px, ${T.ty}px) scale(${T.s})`;
      for (const m of cfg.marks || []) {
        const r = textRect(doc, m.sel, m.text), el = root.querySelector(`[data-mark="${m.id}"]`);
        if (r) Object.assign(el.style, {left: r.left - 3 + 'px', top: r.top + r.height * 0.52 + 'px', width: r.width + 6 + 'px', height: r.height * 0.5 + 'px'});
      }
      for (const p of cfg.pills || []) {
        const r = rectIn(doc, p.sel), el = root.querySelector(`[data-pill="${p.id}"]`);
        if (r) Object.assign(el.style, {left: r.left - 4 + 'px', top: r.top + 2 + 'px', width: r.width + 8 + 'px', height: r.height - 4 + 'px'});
      }
      if (cfg.cursor) paintSiteCursor(root.querySelector('[data-cursor]'), doc, local, cfg.cursor.keys, cfg.cursor.clicks || [], T.s, cfg.cursor.show);
      cfg.render?.(local, root, doc, T);
    });
  }
  return {View, build};
}

export function Caption({c}) {
  return <div className={'caption' + (c.side === 'right' ? ' right' : '')} data-caption={c.id}>
    <div className="cap-tag" lang="en">{c.num && <b>{c.num}</b>}{c.tag}</div>
    <div className="cap-zh" lang="zh-CN">{Array.from(c.zh).map((ch, i) => <span key={i} className="u">{ch}</span>)}</div>
  </div>;
}

export const readyAll = () => Promise.all([...document.querySelectorAll('iframe.site')].map(siteReady));
