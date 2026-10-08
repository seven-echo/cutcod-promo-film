"""Write plan.audio.cues from plan actions. at = action time - audible landmark (measured by sfx_landmarks.py)."""
import json
from pathlib import Path
P = Path(__file__).resolve().parents[1]
LAND = {'click': .001, 'click-alt': .001, 'pop': .001, 'toggle': .001, 'typing': .001, 'ding-dong': .002, 'success': .003, 'resolve': .003, 'whoosh': .202, 'sweep': .342}
GAIN = {'click': 3.0, 'click-alt': 3.2, 'pop': 2.2, 'toggle': 2.8, 'typing': 3.6, 'ding-dong': 1.5, 'success': 1.8, 'resolve': 1.7, 'whoosh': 2.6, 'sweep': 2.4}
MAP = {'brand-hit': 'resolve', 'brand-fly': 'whoosh', 'site-ring1': 'pop', 'site-ring2': 'pop', 'site-ring3': 'pop',
       'code-tab': 'click', 'code-open': 'pop', 'code-copy': 'success', 'code-out': 'sweep',
       'agent-paste': 'typing', 'agent-step1': 'toggle', 'agent-step2': 'toggle', 'agent-step3': 'toggle', 'agent-done': 'ding-dong',
       'prompt-tab': 'click-alt', 'prompt-open': 'pop', 'prompt-copy': 'click', 'skill-tab': 'click-alt', 'skill-note': 'pop',
       'find-cat': 'click', 'find-search': 'click-alt', 'find-type': 'typing', 'find-lang': 'toggle',
       'share-click': 'click', 'share-modal': 'pop', 'share-type': 'typing', 'outro-hit': 'resolve'}
plan = json.loads((P / 'plan.json').read_text(encoding='utf-8'))
cues = []
for s in plan['shots']:
    for a in s['actions']:
        kind = MAP.get(a['id'])
        if not kind: continue
        t = round(s['start'] + a['at'], 3)
        cue = {'at': round(t - LAND[kind], 3), 'actionId': a['id'], 'file': f'assets/sfx/{kind}.wav', 'gain': GAIN[kind], 'role': 'sfx', 'kind': kind}
        if LAND[kind] > .01: cue['syncOffset'] = LAND[kind]
        else: cue['syncOffset'] = LAND[kind]
        cues.append(cue)
plan['audio']['cues'] = sorted(cues, key=lambda c: c['at'])
(P / 'plan.json').write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding='utf-8')
print(len(cues), 'cues')
