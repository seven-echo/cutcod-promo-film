import React from 'react';
import {siteShot} from '../kit/siteShot.jsx';
import {setInput} from '../kit/site.js';
import {shot} from '../engine.js';

// Coordinates are cutcod.com at 1440×900 (measured by tools/measure*.mjs):
// nav tabs code/prompt/skill (215|312|409, 21, ~87×36) · description y 78–131 · category tabs y 165–201
// card 1 media (72,227,246×246) · modal (60,40,1320×820) · modal copy button (1290,299) · copy block (1009,339,343×300)
// search (916,20,260×39) · 中/EN (1186,20) · 上传 (1258,21,50×36) · auth modal: email (543,330) · submit (543,510,354×44)
const click = sel => (w, d) => d.querySelector(sel).click();
const tab = t => click(`.nav-tabs [data-tab=${t}]`);
const cap = (id, at, num, tag, zh, extra = {}) => ({id, at, num, tag, zh, ...extra});
const P = id => shot(id);

export const site = siteShot('site', {
  src: 'index.html',
  cam: [{at: 0, x: 720, y: 405, s: 1.3334}, {at: 2.6, x: 520, y: 260, s: 1.62, ease: 'inOut'}, {at: 4, x: 330, y: 150, s: 2.3, ease: 'inOut'}],
  cursor: {keys: [{at: 0.6, x: 900, y: 300}, {at: 1.0, sel: '.nav-tabs [data-tab=code]', dy: 6}, {at: 1.5, sel: '.nav-tabs [data-tab=prompt]', dy: 6}, {at: 2.0, sel: '.nav-tabs [data-tab=skill]', dy: 6}, {at: 3.6, sel: '.nav-tabs [data-tab=code]', dy: 6}], show: [0.6, 99]},
  pills: [{id: 'p1', sel: '.nav-tabs [data-tab=code]', from: 1.0, to: 3.5}, {id: 'p2', sel: '.nav-tabs [data-tab=prompt]', from: 1.5, to: 3.5}, {id: 'p3', sel: '.nav-tabs [data-tab=skill]', from: 2.0, to: 3.5}],
  frames: [{sel: '.card:nth-child(1) .card-media video', clip: 'uimorph', from: 0, to: 99, fit: 'cover'}, {sel: '.card:nth-child(2) .card-media video', clip: 'higgs', from: 0, to: 99, fit: 'cover'}],
  captions: [cap('site', 0.4, null, 'Three ways to remake', P('site').description, {out: 3.55})],
  fadeIn: 0.2, inAt: -0.2,
});

export const code = siteShot('code', {
  src: 'index.html',
  cam: [
    {at: 0, x: 330, y: 150, s: 2.3},
    {at: 1.3, x: 720, y: 150, s: 1.8, ease: 'inOut'},
    {at: 2.9, x: 640, y: 330, s: 1.55, ease: 'inOut'},
    {at: 3.9, x: 720, y: 450, s: 1.3334, ease: 'inOut'},
    {at: 4.9, x: 1100, y: 330, s: 2.0, ease: 'inOut'},
    {at: 6.4, x: 1150, y: 360, s: 2.0},
    {at: 7.1, x: 1060, y: 560, s: 1.4, ease: 'inOut'},
    {at: 8.8, x: 1060, y: 560, s: 1.4},
    {at: 9.7, x: 1060, y: 470, s: 2.4, ease: 'inOut'},
    {at: 10.9, x: 1090, y: 470, s: 2.5, ease: 'lin'},
    {at: 12, x: 1180, y: 450, s: 4.6, ease: 'in'},
  ],
  cursor: {keys: [{at: 0, sel: '.nav-tabs [data-tab=code]', dy: 6}, {at: 0.4, sel: '.nav-tabs [data-tab=code]', dy: 6}, {at: 2.3, x: 560, y: 160}, {at: 3.4, sel: '.card:nth-child(1) .card-media', dx: 20, dy: 30}, {at: 5.4, x: 1180, y: 400}, {at: 6.6, sel: '#modalCopy', dx: -6, dy: 2}, {at: 8.6, sel: '#modalCopy', dx: 30, dy: 60}], clicks: [0.4, 3.4, 6.6], show: [-1, 9.4]},
  steps: [
    {at: 0.4, run: tab('code')},
    {at: 3.4, run: click('.card:nth-child(1) .card-media'), settle: 300},
    {at: 6.6, run: click('#modalCopy')},
    {at: 9.0, run: (w, d) => d.getElementById('toast').classList.remove('show')},   // the site's own 2.4 s toast timer
  ],
  frames: [
    {sel: '.card:nth-child(1) .card-media video', clip: 'uimorph', from: -1, to: 3.4, t0: 3, fit: 'cover'},
    {sel: '.card:nth-child(2) .card-media video', clip: 'higgs', from: -1, to: 3.4, t0: 3, fit: 'cover'},
    {sel: '#modalVideo', clip: 'uimorph', from: 3.4, to: 99, t0: 7.4, fit: 'contain'},
  ],
  marks: [{id: 'm1', sel: '#typeDescription', text: '节省95%token', from: 1.8, to: 3.6}],
  captions: [
    cap('c1', 0.7, '01', 'Source code', P('code').description, {out: 4.3}),
    cap('c2', 4.6, null, 'Everything to remake it', '弹窗里有成片、源码地址和复现步骤。', {out: 6.5}),
    cap('c3', 9.7, null, 'One click', '点一下「复制」，整段复现说明直接带走。', {out: 11.4}),
  ],
  build: (tl, root, at) => tl.fromTo(root.querySelector('[data-cam]'), {filter: 'blur(0px)'}, {filter: 'blur(14px)', duration: 0.6, ease: 'power2.in'}, at(11.4)),
});

export const prompt = siteShot('prompt', {
  src: 'index.html',
  cam: [
    {at: 0, x: 380, y: 150, s: 2.6},
    {at: 0.9, x: 380, y: 150, s: 2.6},
    {at: 2.0, x: 720, y: 150, s: 1.45, ease: 'inOut'},
    {at: 3.0, x: 300, y: 330, s: 1.8, ease: 'inOut'},
    {at: 4.2, x: 720, y: 450, s: 1.3334, ease: 'inOut'},
    {at: 5.2, x: 1000, y: 380, s: 1.6, ease: 'inOut'},
    {at: 7, x: 1040, y: 390, s: 1.7, ease: 'lin'},
  ],
  cursor: {keys: [{at: 0, sel: '.nav-tabs [data-tab=code]', dy: 6}, {at: 0.5, sel: '.nav-tabs [data-tab=prompt]', dy: 6}, {at: 2.4, x: 600, y: 200}, {at: 3.6, sel: '.card:nth-child(1) .card-media', dx: 30, dy: 20}, {at: 5.6, sel: '#modalCopy', dx: -6, dy: 2}, {at: 7, sel: '#modalCopy', dx: 20, dy: 40}], clicks: [0.5, 3.6, 5.6]},
  steps: [{at: 0.5, run: tab('prompt'), settle: 300}, {at: 3.6, run: click('.card:nth-child(1) .card-media'), settle: 300}, {at: 5.6, run: click('#modalCopy')}],
  frames: [{sel: '.card:nth-child(1) .card-media video', clip: 'liquid', from: 0.6, to: 3.6, fit: 'cover'}, {sel: '#modalVideo', clip: 'liquid', from: 3.6, to: 99, t0: 3, fit: 'contain'}],
  marks: [{id: 'm1', sel: '#typeDescription', text: 'Claude Opus 5.5及以上模型', from: 1.7, to: 3.4}],
  captions: [cap('c1', 1.0, '02', 'Video prompts', P('prompt').description, {side: 'right'})],
});

const MadeWith = <div className="made-with"><span className="arrow">↑</span><span className="zh">这支片子就是用它做的</span><span className="en">Made with this skill</span></div>;
export const skill = siteShot('skill', {
  src: 'index.html',
  cam: [
    {at: 0, x: 380, y: 150, s: 2.6},
    {at: 0.5, x: 450, y: 150, s: 2.6, ease: 'inOut'},
    {at: 1.0, x: 450, y: 150, s: 2.6},
    {at: 2.2, x: 720, y: 220, s: 1.7, ease: 'inOut'},
    {at: 3.4, x: 400, y: 330, s: 2.3, ease: 'inOut'},
    {at: 7, x: 420, y: 335, s: 2.45, ease: 'lin'},
  ],
  cursor: {keys: [{at: 0, sel: '.nav-tabs [data-tab=prompt]', dy: 6}, {at: 0.5, sel: '.nav-tabs [data-tab=skill]', dy: 6}, {at: 2.4, x: 520, y: 260}, {at: 3.3, sel: '.card:nth-child(1) .card-media', dx: 60, dy: -20}, {at: 7, sel: '.card:nth-child(1) .card-media', dx: 70, dy: -24}], clicks: [0.5]},
  steps: [{at: -9, run: tab('prompt'), settle: 300}, {at: 0.5, run: tab('skill'), settle: 300}],
  frames: [{sel: '.card:nth-child(1) .card-media video', clip: 'guizang', from: 0.6, to: 99, fit: 'cover'}],
  notes: [{id: 'n1', x: 82, y: 322, from: 3.8, el: MadeWith}],
  captions: [cap('c1', 1.0, '03', 'Video skills', P('skill').description, {side: 'right'})],
});

const typeSteps = ['宣', '宣传'].map((v, i) => ({at: 2.4 + i * 0.25, run: (w, d) => setInput(w, d.getElementById('searchInput'), v)}));
export const find = siteShot('find', {
  src: 'index.html',
  cam: [
    {at: 0, x: 250, y: 175, s: 2.4},
    {at: 0.9, x: 250, y: 175, s: 2.4},
    {at: 1.9, x: 720, y: 450, s: 1.5, ease: 'inOut'},
    {at: 2.4, x: 1040, y: 60, s: 2.2, ease: 'inOut'},
    {at: 3.0, x: 1040, y: 60, s: 2.2},
    {at: 3.8, x: 720, y: 450, s: 1.5, ease: 'inOut'},
    {at: 4.4, x: 1150, y: 60, s: 2.2, ease: 'inOut'},
    {at: 4.7, x: 1150, y: 60, s: 2.2},
    {at: 5.4, x: 720, y: 405, s: 1.3334, ease: 'inOut'},
  ],
  cursor: {keys: [{at: 0.2, x: 120, y: 240}, {at: 0.6, sel: '.category-tab[data-category=product]', dy: 4}, {at: 1.8, x: 820, y: 300}, {at: 2.3, sel: '#searchInput', dx: -60}, {at: 3.6, sel: '#searchInput', dx: -40, dy: 30}, {at: 4.4, sel: '#languageToggle'}, {at: 6, sel: '#languageToggle', dx: 30, dy: 40}], clicks: [0.6, 2.3, 4.4]},
  steps: [{at: 0.6, run: click('.category-tab[data-category=product]'), settle: 300}, ...typeSteps, {at: 4.4, run: click('#languageToggle'), settle: 300}],
  captions: [cap('c1', 0.4, null, 'Find it fast', P('find').description)],
});

const email = 'you@studio.com';
const emailSteps = Array.from({length: email.length}, (_, i) => ({at: 2.0 + i * 0.075, settle: 0, run: (w, d) => setInput(w, d.getElementById('email'), email.slice(0, i + 1))}));
export const share = siteShot('share', {
  src: 'index.html',
  cam: [{at: 0, x: 1250, y: 45, s: 2.4}, {at: 0.9, x: 1283, y: 45, s: 2.4, ease: 'inOut'}, {at: 1.8, x: 900, y: 430, s: 1.6, ease: 'inOut'}, {at: 4, x: 900, y: 440, s: 1.65, ease: 'lin'}],
  cursor: {keys: [{at: 0, x: 1186, y: 60}, {at: 0.9, sel: '#uploadEntry'}, {at: 1.9, sel: '#email', dx: 40}, {at: 3.0, sel: '#email', dx: 60, dy: 10}, {at: 3.5, sel: '#authSubmit'}], clicks: [0.9, 1.9]},
  steps: [{at: 0.9, run: click('#uploadEntry'), settle: 300}, ...emailSteps],
  captions: [cap('c1', 0.3, null, 'Share yours', P('share').description, {side: 'right'})],
});
