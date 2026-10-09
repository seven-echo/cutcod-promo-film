import React from 'react';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {site, code} from '../../src/shots/sites.jsx';
import {seek as filmSeek, master, shot, frame} from '../../src/engine.js';
import {readyAll} from '../../src/kit/siteShot.jsx';
import {ShotContext} from '../../src/film-store.js';

// The template is the film's own site → code pair, not a second layout.
// site opens at scale 1.3334 (the 1440×900 page filling 1920×1080).
// code continues on that same camera: tab, highlighter, card, copy, toast.
const pieces = [
  {id: 'site', piece: site},
  {id: 'code', piece: code},
];
const start = shot('site').start;
const end = shot('code').end;
const duration = end - start;

function Template() {
  return (
    <main id="film">
      {pieces.map(({id, piece}, index) => {
        const View = piece.View;
        return (
          <section key={id} data-shot={id} className={'shot shot-' + id} style={{zIndex: index + 1}}>
            <ShotContext.Provider value={shot(id)}>
              <View />
            </ShotContext.Provider>
          </section>
        );
      })}
    </main>
  );
}

const root = createRoot(document.getElementById('film-root'));
flushSync(() => root.render(<Template />));

window.TEMPLATE = {start, duration};
window.seek = (local) => filmSeek(start + Math.min(duration, Math.max(0, Number(local) || 0)));
window.__filmReady = (async () => {
  await document.fonts.ready;
  await readyAll();
  await frame();
  await frame();
  for (const {piece} of pieces) {
    const built = piece.build(master);
    if (built instanceof Promise) await built;
  }
  await window.seek(0);
})();
