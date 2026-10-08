"""Write plan.json (shots, facts, actions) and the hook poster-wall fixture. Audio cues are added by tools/cues.py."""
import json
from pathlib import Path
P = Path(__file__).resolve().parents[1]
S = lambda *a: ['file:public/site/' + x for x in a]
A = lambda i, at, what, snd=False: {'id': i, 'at': at, 'action': what, 'soundRequired': snd}
shots = [
 dict(id='hook', start=0, end=4, type='title', headlineEn='See it. Copy it. Make it.', headline='看到喜欢的视频，自己也能做', description='', descriptionAt=0.9, claim=False, source=[], component=None,
      plainExplanation='开场：一面由 CutCod 站内真实作品封面组成的影墙。', actions=[A('hook-copy', 0.2, '英文标题入场'), A('hook-mark', 2.2, '荧光笔扫过关键词')]),
 dict(id='brand', start=4, end=8, type='title', headlineEn='A library of reproducible videos', headline='CutCod · 可复现视频资源库', description='', descriptionAt=0.6, claim=False, source=[], component=None,
      plainExplanation='品牌：Logo、产品名和网站标题。', actions=[A('brand-hit', 0.0, '品牌 Logo 落下', True), A('brand-fly', 3.4, 'Logo 飞到网站导航', True)]),
 dict(id='site', start=8, end=12, type='workspace', headlineEn='Three ways to remake', headline='三种复现方式',
      description='每支视频都附上做法：源代码、提示词或 Skill，挑一种就能开始。', descriptionAt=0.4, claim=True,
      source=S('index.html', 'catalog-layout.js'), component='public/site/index.html',
      plainExplanation='网站按“视频源代码 / 视频提示词 / 视频 Skill”三类收录作品，每条都带可以复制的内容。',
      actions=[A('site-ring1', 1.0, '圈出视频源代码', True), A('site-ring2', 1.5, '圈出视频提示词', True), A('site-ring3', 2.0, '圈出视频 Skill', True)]),
 dict(id='code', start=12, end=24, type='detail', headlineEn='Source code', headline='视频源代码',
      description='源代码类：整套工程交给你，复现后还能接着改。', descriptionAt=0.7, claim=True,
      source=S('catalog.js', 'copy-templates.js', 'api/resources.json'), component='public/site/index.html#modalBackdrop',
      plainExplanation='点开一条源代码作品，弹窗里有成片、源码地址和复现步骤；点“复制”会把整段说明放进剪贴板，并提示“已复制，可以粘贴使用”。',
      actions=[A('code-tab', 0.4, '点击“视频源代码”标签', True), A('code-mark', 1.8, '荧光笔扫过“节省95%token”'), A('code-open', 3.4, '点开 UI Morph 作品弹窗', True), A('code-copy', 6.6, '点击复制，出现已复制提示', True), A('code-out', 11.95, '推入复制框转场', True)]),
 dict(id='agent', start=24, end=30, type='illustration', headlineEn='Paste & reproduce', headline='粘贴给智能体',
      description='粘贴给 Codex 或 Claude，按说明把工程跑起来，接着就能改。', descriptionAt=0.5, claim=False, source=S('catalog.js'), component=None,
      plainExplanation='示意画面：把复制的说明粘贴到智能体，它按其中步骤读取源码、安装依赖、生成预览。智能体界面为示意，不是 CutCod 的界面。',
      actions=[A('agent-paste', 0.3, '复制内容落进对话框', True), A('agent-step1', 1.6, '读取源码完成', True), A('agent-step2', 2.5, '安装依赖完成', True), A('agent-step3', 3.3, '生成预览完成', True), A('agent-done', 3.6, '复现出的视频出现', True)]),
 dict(id='prompt', start=30, end=37, type='detail', headlineEn='Video prompts', headline='视频提示词',
      description='提示词类：先看成片，复制完整提示词，交给 Claude Opus 5.5 及以上模型复现。', descriptionAt=1.0, claim=True,
      source=S('catalog.js', 'catalog-layout.js', 'api/resources.json'), component='public/site/index.html',
      plainExplanation='切到“视频提示词”，每张卡是一支用提示词生成的视频；打开后可以复制完整提示词。',
      actions=[A('prompt-tab', 0.5, '点击“视频提示词”标签', True), A('prompt-open', 3.6, '打开 Liquid Glass 作品', True), A('prompt-copy', 5.6, '复制完整提示词', True)]),
 dict(id='skill', start=37, end=44, type='detail', headlineEn='Video skills', headline='视频 Skill',
      description='Skill 类：装进你的智能体，用 Agent Skill 产出新的创意视频。', descriptionAt=1.0, claim=True,
      source=S('catalog.js', 'api/resources.json'), component='public/site/index.html',
      plainExplanation='切到“视频 Skill”，收录可安装的 Agent Skill；第一张就是制作本片所用的“真实产品宣传片 Skill”。',
      actions=[A('skill-tab', 0.5, '点击“视频 Skill”标签', True), A('skill-note', 3.85, '标注本片用它制作', True)]),
 dict(id='find', start=44, end=50, type='detail', headlineEn='Find it fast', headline='筛选、搜索、中英切换',
      description='按类别筛选、按关键词搜索，界面一键切换中英文。', descriptionAt=0.4, claim=True,
      source=S('catalog.js', 'catalog-layout.js', 'index.html'), component='public/site/index.html',
      plainExplanation='点“产品动画”只看产品类作品；在搜索框输入“宣传”结果立刻变少；点“中 / EN”整站换成英文。',
      actions=[A('find-cat', 0.6, '点击产品动画分类', True), A('find-type', 2.4, '输入搜索词', True), A('find-search', 2.3, '点进搜索框', True), A('find-lang', 4.4, '切换中英文', True)]),
 dict(id='share', start=50, end=54, type='detail', headlineEn='Share yours', headline='上传你的作品',
      description='做了好视频？点「上传」，登录后就能投稿分享。', descriptionAt=0.3, claim=True,
      source=S('index.html', 'contribute.html', 'contribute.js', 'auth-modal.js'), component='public/site/contribute.html',
      plainExplanation='点首页黄色“上传”进入创作者中心，未登录时弹出邮箱验证码登录，登录后提交作品，审核通过后公开展示。',
      actions=[A('share-click', 0.9, '点击上传', True), A('share-modal', 1.0, '登录弹窗出现', True), A('share-type', 2.0, '输入邮箱', True)]),
 dict(id='outro', start=54, end=58, type='end', headlineEn='See it. Copy it. Make it.', headline='看到喜欢的，复制下来，自己也能做', description='cutcod.com', descriptionAt=0.8, claim=False, source=[], component=None,
      plainExplanation='落版：Logo、产品名、网址。', actions=[A('outro-hit', 0.0, '黄色落版铺满', True)]),
]
plan = {
 'demo': False, 'product': 'CutCod · 可复现视频资源库', 'style': 'repo', 'width': 1920, 'height': 1080, 'fps': 30, 'duration': 58,
 'repo': 'public/site',
 'scope': {'versions': 'cutcod.com 线上版（2026-10-08 抓取）', 'platforms': ['web'], 'notCovered': ['后台 admin.cutcod.com', '登录后的创作者中心投稿表单']},
 'audioRequired': True, 'sfxRequired': True, 'poster': True,
 'typography': {'mode': 'bilingual', 'zhFont': 'PingFang SC（本机已装，与网站同字体栈）', 'enFont': 'Segoe UI Black / Bold（本机字体）', 'zhStyle': 'sans-serif'},
 'audio': {'ducking': {'enabled': True}, 'music': {'file': 'assets/music.wav', 'gain': 0.62}, 'beatGrid': {'bpm': 120, 'offset': 0}, 'cues': []},
 'shots': shots,
}
out = P / 'plan.json'
try:
    prev = json.loads(out.read_text(encoding='utf-8'))
    if not prev.get('demo'): plan['audio']['cues'] = prev['audio']['cues']
except Exception:
    pass
out.write_text(json.dumps(plan, ensure_ascii=False, indent=1), encoding='utf-8')
# Hook poster wall: real site posters, deterministic pick across the catalogue.
res = json.loads((P / 'public/site/api/resources.json').read_text(encoding='utf-8'))['resources']
picked = [r for i, r in enumerate(res) if i % 5 == 0 and r['poster']][:56]
wall = [{'src': 'site/' + r['poster'], 'ratio': max(0.75, min(1.78, float(r['ratio'] or 1.48))), 'duration': r['duration']} for r in picked]
(P / 'src/fixtures').mkdir(exist_ok=True)
(P / 'src/fixtures/wall.json').write_text(json.dumps(wall, ensure_ascii=False), encoding='utf-8')
print('plan ok', len(shots), 'wall', len(wall))
