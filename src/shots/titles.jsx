import React from 'react';
import {shot, onDrive, onRender} from '../engine.js';
import plan from '../../plan.json';
import wall from '../fixtures/wall.json';
import {clipFrame, clipIndex} from '../kit/site.js';
import {Caption} from '../kit/siteShot.jsx';

const sec = id => document.querySelector(`section[data-shot="${id}"]`);
const chars = (t, cls = 'u') => Array.from(t).map((c, i) => <span key={i} className={cls}>{c}</span>);
const LOGO = 'site/assets/cutcod-logo.jpg';

// ---------------- hook: wall of real posters ----------------
const COLS = 7, PER = 8, DRIFT = [-240, -60, -300, -20, -260, -90, -220];
export function HookView() {
  return <div className="stage">
    <div className="wall">
      {Array.from({length: COLS}, (_, c) => <div key={c} className="wall-col" data-col={c}>
        {Array.from({length: PER}, (_, r) => { const w = wall[(c * PER + r * 3) % wall.length]; return <div key={r} className="wall-card" style={{height: Math.round(300 / w.ratio), backgroundImage: `url(${w.src})`}}><span>{w.duration}</span></div>; })}
      </div>)}
    </div>
    <div className="wall-veil" />
    <div className="hook-copy">
      <div className="hook-en" lang="en">{'See it. Copy it. Make it.'.split(' ').map((w, i) => <span key={i} className="w"><span>{w}</span>{' '}</span>)}</div>
      <div className="hook-zh" lang="zh-CN">{chars('看到喜欢的视频，')}<span className="hl"><i data-hl />{chars('自己也能做', 'u')}</span></div>
    </div>
  </div>;
}
export const buildHook = tl => {
  const s = shot('hook'), root = sec('hook');
  tl.set(root, {opacity: 1}, 0);
  root.querySelectorAll('.wall-col').forEach((col, i) => {
    const dir = i % 2 ? 1 : -1;
    tl.fromTo(col, {y: DRIFT[i]}, {y: DRIFT[i] + dir * 120, duration: 3.6, ease: 'none'}, 0);
    tl.to(col, {y: `+=${dir * 520}`, filter: 'blur(10px)', duration: 0.5, ease: 'power3.in'}, 3.6);
  });
  tl.fromTo(root.querySelectorAll('.hook-en .w > span'), {yPercent: 105}, {yPercent: 0, duration: 0.7, stagger: 0.09, ease: 'expo.out'}, 0.2);
  tl.fromTo(root.querySelectorAll('.hook-zh .u'), {opacity: 0, y: 18, filter: 'blur(8px)'}, {opacity: 1, y: 0, filter: 'blur(0px)', duration: 0.5, stagger: 0.035, ease: 'power3.out'}, 0.9);
  tl.fromTo(root.querySelector('[data-hl]'), {scaleX: 0}, {scaleX: 1, duration: 0.45, ease: 'power2.out'}, 2.2);
  tl.to(root.querySelector('.hook-copy'), {opacity: 0, y: -40, filter: 'blur(10px)', duration: 0.35, ease: 'power2.in'}, 3.65);
  if (plan.poster) tl.fromTo('#poster', {opacity: 1}, {opacity: 0, duration: 0.3, ease: 'none'}, 0.3);
};

// ---------------- brand ----------------
export function BrandView() {
  return <div className="stage" style={{background: 'transparent'}}>
    <div className="brand-bg" />
    <div className="brand-row"><img src={LOGO} alt="CutCod" /><span className="name">{chars('CutCod')}</span></div>
    <div className="brand-sub">
      <div className="brand-zh" lang="zh-CN"><span className="hl"><i data-hl />{chars('可复现')}</span>{chars('视频资源库')}</div>
      <div className="brand-en" lang="en">A library of reproducible videos</div>
    </div>
  </div>;
}
// Where the site shot (cam 1.3334 at page top) shows the real nav brand: site rect (72,21,104,36).
const SITE_K = 1920 / 1440, NAV = {x: 72 * SITE_K, y: 21 * SITE_K, h: 36 * SITE_K};
export const buildBrand = tl => {
  const s = shot('brand'), root = sec('brand'), at = t => s.start + t;
  const row = root.querySelector('.brand-row'), img = row.querySelector('img');
  const w = row.offsetWidth, h = row.offsetHeight, x0 = -w / 2;   // row is left:50%; centre it with x
  const k = NAV.h / img.offsetHeight;
  const dy = NAV.y - row.offsetTop - (h - img.offsetHeight) / 2 * k;
  tl.set(root, {opacity: 1}, at(-0.4));
  tl.fromTo(root.querySelector('.brand-bg'), {clipPath: 'circle(0px at 960px 540px)'}, {clipPath: 'circle(1200px at 960px 540px)', duration: 0.45, ease: 'power3.in'}, at(-0.4));
  tl.fromTo(row, {x: x0, y: 0, scale: 1, opacity: 1, transformOrigin: '0 0'}, {x: x0, y: 0, scale: 1, opacity: 1, transformOrigin: '0 0', duration: 0.01}, at(-0.4));
  tl.fromTo(img, {scale: 0.4, opacity: 0, filter: 'blur(14px)'}, {scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.6, ease: 'expo.out'}, at(0));
  tl.fromTo(row.querySelectorAll('.name .u'), {opacity: 0, y: 60}, {opacity: 1, y: 0, duration: 0.55, stagger: 0.05, ease: 'expo.out'}, at(0.15));
  tl.fromTo(root.querySelectorAll('.brand-zh .u'), {opacity: 0, y: 20}, {opacity: 1, y: 0, duration: 0.45, stagger: 0.04, ease: 'power3.out'}, at(0.6));
  tl.fromTo(root.querySelector('.brand-zh [data-hl]'), {scaleX: 0}, {scaleX: 1, duration: 0.45, ease: 'power2.out'}, at(1.0));
  tl.fromTo(root.querySelector('.brand-en'), {opacity: 0, y: 14}, {opacity: 1, y: 0, duration: 0.5, ease: 'power3.out'}, at(1.1));
  // Logo flies to the real site's nav brand (match cut into the site shot).
  tl.to(root.querySelector('.brand-sub'), {opacity: 0, y: 20, duration: 0.3, ease: 'power2.in'}, at(2.9));
  tl.to(row, {x: NAV.x - row.offsetLeft, y: dy, scale: k, duration: 0.75, ease: 'power3.inOut'}, at(3.25));
  tl.to(root.querySelector('.brand-bg'), {opacity: 0, duration: 0.2, ease: 'none'}, at(3.8));
  tl.to(row, {opacity: 0, duration: 0.15, ease: 'none'}, at(4.02));
};

// ---------------- agent (illustration of pasting into Codex / Claude) ----------------
const PASTED = '请读取以下视频源代码，完成视频复现，并保留可二次编辑的完整工程。\n\n作品：UI Morph 交互动效\n源码材料：https://github.com/cutcodstudio/cutcod-ui-morph\n\n先读取项目 README、依赖配置及对应作品的源码入口……';
const STEPS = [[1.0, 1.6, <>读取源码仓库 <code>cutcod-ui-morph</code></>], [1.8, 2.5, <>按 README 安装依赖并运行</>], [2.6, 3.3, <>保留原有画面和动画，生成视频预览</>]];
export function AgentView({shot: s}) {
  return <div className="stage">
    <div className="agent-win">
      <div className="agent-bar"><i /><i /><i /><span className="lbl">你的智能体 · Codex / Claude</span><span className="tag">示意画面</span></div>
      <div className="agent-body">
        <div className="agent-bubble"><span className="clip">PASTED FROM CUTCOD</span>{'\n' + PASTED}</div>
        <div className="agent-steps">{STEPS.map(([a, b, label], i) => <div key={i} className="agent-step" data-step={i}><span className="ic"><i className="spin" /><b className="ok">✓</b></span><span>{label}</span></div>)}</div>
      </div>
    </div>
    <div className="agent-preview"><div className="head"><span>视频预览 · UI Morph 交互动效</span><span className="done">✓ 复现完成</span></div><canvas width="1212" height="1160" /></div>
    <Caption c={{id: 'agent', tag: s.headlineEn, zh: s.description}} />
  </div>;
}
export const buildAgent = tl => {
  const s = shot('agent'), root = sec('agent'), at = t => s.start + t;
  tl.set(root, {opacity: 1}, at(0));
  tl.fromTo(root.querySelector('.agent-win'), {y: 60, opacity: 0}, {y: 0, opacity: 1, duration: 0.5, ease: 'expo.out'}, at(0));
  tl.fromTo(root.querySelector('.agent-bubble'), {x: 220, y: -160, scale: 1.25, opacity: 0, filter: 'blur(16px)'}, {x: 0, y: 0, scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.55, ease: 'expo.out'}, at(0.05));
  root.querySelectorAll('.agent-step').forEach((el, i) => {
    const [a, b] = STEPS[i];
    tl.fromTo(el, {opacity: 0, x: -24}, {opacity: 1, x: 0, duration: 0.35, ease: 'power3.out'}, at(a));
    tl.fromTo(el.querySelector('.ok'), {opacity: 0, scale: 0.4}, {opacity: 1, scale: 1, duration: 0.25, ease: 'back.out(2)'}, at(b));
    tl.to(el.querySelector('.spin'), {opacity: 0, duration: 0.1}, at(b));
  });
  tl.fromTo(root.querySelector('.agent-preview'), {opacity: 0, x: 80, scale: 0.94}, {opacity: 1, x: 0, scale: 1, duration: 0.6, ease: 'expo.out'}, at(3.6));
  const cap = root.querySelector('[data-caption="agent"]');
  tl.fromTo(cap, {opacity: 0, y: 46}, {opacity: 1, y: 0, duration: 0.55, ease: 'expo.out'}, at(0.5));
  tl.fromTo(cap.querySelectorAll('.cap-zh .u'), {opacity: 0, y: 14}, {opacity: 1, y: 0, duration: 0.4, stagger: 0.012, ease: 'power3.out'}, at(0.62));
  onRender('agent', local => root.querySelectorAll('.agent-step .spin').forEach(sp => { sp.style.transform = `rotate(${local * 540}deg)`; }));
  const canvas = root.querySelector('.agent-preview canvas');
  onDrive('agent', async local => {
    if (local < 3.4) return;
    const img = await clipFrame('uimorph', clipIndex('uimorph', local - 3.6));
    if (!img) return;
    const g = canvas.getContext('2d'), k = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
    g.drawImage(img, (canvas.width - img.naturalWidth * k) / 2, (canvas.height - img.naturalHeight * k) / 2, img.naturalWidth * k, img.naturalHeight * k);
  });
};

// ---------------- outro ----------------
export const OUTRO_ORIGIN = {x: 608, y: 643};   // where the share shot's cursor ends (登录 button)
export function OutroView({shot: s}) {
  return <div className="stage" style={{background: 'transparent'}}>
    <div className="outro-bg" />
    <div className="outro-in">
      <div className="outro-brand"><img src={LOGO} alt="CutCod" /><span className="name">CutCod</span></div>
      <div className="outro-en" lang="en">{s.headlineEn}</div>
      <div className="outro-zh" lang="zh-CN">{s.headline}</div>
      <div className="outro-url" lang="en">{s.description}</div>
    </div>
  </div>;
}
export const buildOutro = tl => {
  const s = shot('outro'), root = sec('outro'), at = t => s.start + t, o = OUTRO_ORIGIN;
  tl.set(root, {opacity: 1}, at(-0.35));
  tl.fromTo(root.querySelector('.outro-bg'), {clipPath: `circle(0px at ${o.x}px ${o.y}px)`}, {clipPath: `circle(2300px at ${o.x}px ${o.y}px)`, duration: 0.6, ease: 'power3.in'}, at(-0.35));
  const parts = root.querySelectorAll('.outro-brand, .outro-en, .outro-zh, .outro-url');
  tl.fromTo(parts, {opacity: 0, y: 40}, {opacity: 1, y: 0, duration: 0.6, stagger: 0.14, ease: 'expo.out'}, at(0.2));
  tl.fromTo(root.querySelector('.outro-in'), {scale: 1}, {scale: 1.035, duration: 3.6, ease: 'none'}, at(0.2));
};
