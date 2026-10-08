// Downloads the media this film shows but does not redistribute, then extracts the frame sequences
// the film draws into the site's <video> boxes. Safe to re-run (skips files that already exist).
//   posters  → public/site/assets/posters/   (cutcod.com catalogue thumbnails, from api/resources.json)
//   clips    → media/*.mp4 → public/clips/<name>/0001.jpg … (30 fps windows used by the film)
import {readFile, mkdir, writeFile, readdir, stat} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const SITE = 'https://cutcod.com/';
const CLIPS = [
  // name, source URL, start s, length s, width px   (frames = length × 30)
  ['uimorph', SITE + 'uploads/d88f2c0e4dfc4b919fc9bc908352bd34.mp4', 3.5, 8.5, 720],   // "UI Morph 交互动效" · CutCod
  ['higgs', SITE + 'uploads/42ff10d3592244df8c925cdddde93b90.mp4', 0, 8, 560],          // "Higgsfield产品动画" · CutCod
  ['liquid', 'https://media.skillry.dev/opus-5-5/twoclipping-496100/original.mp4', 4, 8, 640],   // "Liquid Glass Product Film"
  ['guizang', 'https://media.skillry.dev/opus-5-5/howdevelop-733090/original.mp4', 2.5, 7, 640], // "真实产品宣传片 Skill" demo
];
async function download(url, out) {
  if (existsSync(out) && (await stat(out)).size > 0) return 'skip';
  await mkdir(path.dirname(out), {recursive: true});
  for (let i = 0; i < 3; i++) {
    try {
      const r = await fetch(url, {headers: {'User-Agent': 'Mozilla/5.0 cutcod-promo-film'}});
      if (!r.ok) throw new Error(r.status + ' ' + url);
      await writeFile(out, Buffer.from(await r.arrayBuffer())); return 'ok';
    } catch (e) { if (i === 2) throw e; }
  }
}
const {resources} = JSON.parse(await readFile('public/site/api/resources.json', 'utf8'));
const posters = [...new Set(resources.map(r => r.poster).filter(Boolean))];
let done = 0, fail = [];
const queue = [...posters];
await Promise.all(Array.from({length: 10}, async () => {
  for (let p; (p = queue.shift());) {
    try { await download(SITE + p, path.join('public/site', p)); } catch (e) { fail.push(e.message); }
    if (++done % 50 === 0) console.log(`posters ${done}/${posters.length}`);
  }
}));
console.log(`posters ${posters.length - fail.length}/${posters.length}`);
if (fail.length) { console.error('failed posters:\n' + fail.join('\n')); process.exitCode = 1; }
for (const [name, url, ss, t, w] of CLIPS) {
  const mp4 = path.join('media', name + '.mp4'), dir = path.join('public/clips', name);
  await download(url, mp4);
  if (existsSync(dir) && (await readdir(dir)).length >= Math.round(t * 30) - 1) { console.log(`clip ${name}: frames present`); continue; }
  await mkdir(dir, {recursive: true});
  const r = spawnSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(ss), '-t', String(t), '-i', mp4, '-vf', `fps=30,scale=${w}:-2`, '-frames:v', String(Math.round(t * 30)), '-q:v', '4', path.join(dir, '%04d.jpg')], {stdio: 'inherit'});
  if (r.status !== 0) throw new Error('ffmpeg failed for ' + name + ' (is FFmpeg on PATH?)');
  console.log(`clip ${name}: ${(await readdir(dir)).length} frames`);
}
