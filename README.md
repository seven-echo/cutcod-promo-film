# CutCod 产品宣传片 · 代码驱动源工程

58 秒横版（1920×1080，30 fps）的 CutCod（cutcod.com，可复现视频资源库）宣传片。画面不是录屏：真实的 cutcod.com 页面在无头浏览器里运行，影片用真实点击、输入驱动它（切标签、打开作品、复制、搜索、中英切换、登录弹窗），再由一条 GSAP 主时间轴控制镜头推拉、荧光笔、字幕和光标，逐帧截图后用 FFmpeg 合成。配乐与音效由代码生成，和画面动作逐帧对齐。

成片结构：影墙开场 → 品牌 → 三种复现方式 → 01 视频源代码（打开作品、复制）→ 粘贴给智能体（示意画面）→ 02 视频提示词 → 03 视频 Skill → 筛选/搜索/中英切换 → 上传投稿 → 黄色落版。

## 环境

| 依赖 | 版本 |
|---|---|
| Node.js | ≥ 22（已验证 24.17） |
| Python | ≥ 3.9，仅标准库（重做配乐需要 numpy / scipy / soundfile） |
| FFmpeg / ffprobe | 在 PATH 中 |
| Chromium | 由 Playwright 安装 |
| 网络 | 首次 `npm run setup` 需要访问 cutcod.com 与 media.skillry.dev |
| 字体 | 系统字体：中文 PingFang SC / Noto Sans SC / Microsoft YaHei；英文 Segoe UI / Helvetica Neue / Arial。Linux 请安装 Noto Sans CJK SC |

## 运行

```sh
npm ci
npx playwright install chromium --only-shell
npm run setup        # 下载封面图和 4 段作品视频，抽出影片用的帧序列
npm run film         # 混音 → 构建 → 逐帧渲染，输出 renders/cutcod-promo.mp4（约 5 分钟）
npm run check        # 可选：结构、时间线、音画对齐、首帧检查
```

预览与静帧：

```sh
npm run preview                         # 打印本地地址；打开后在浏览器控制台执行 await seek(15) 或 playFilm()（预览无声音）
npm run build && node stills.mjs evidence/stills 3 16 27 41   # 任意时刻出静帧
npm run build && node render.mjs --from 12 --to 24 --output renders/draft.mp4   # 局部草稿（无声）
```

## 源码入口

| 文件 | 作用 |
|---|---|
| `plan.json` | **时间线唯一来源**：10 个镜头的起止时间、中英标题、说明文字、动作时刻、音效 cue。由 `tools/make_plan.py` 生成 |
| `src/client.jsx` | 页面入口：挂载影片，等待 6 个网站 iframe 就绪，运行各镜头 builder，暴露 `window.seek(t)` |
| `src/engine.js` | `seek(t)`：推进 React 时钟 → 执行网站交互 → 定位 GSAP 主时间轴 → 每帧绘制 |
| `src/shots/index.js` | 镜头 id → 视图 + builder |
| `src/shots/titles.jsx` | 非网站镜头：`hook` 影墙开场、`brand` 品牌、`agent` 智能体示意、`outro` 落版 |
| `src/shots/sites.jsx` | 网站镜头：`site` `code` `prompt` `skill` `find` `share`，每个镜头一份配置（相机关键帧、光标路径、点击步骤、荧光笔、字幕、视频帧） |
| `src/kit/siteShot.jsx` | 网站镜头工厂：iframe + 相机 + 光标 + 荧光笔 + 字幕；交互按时间前进，向后跳转时重载页面 |
| `src/kit/site.js` | 相机插值、页面内测量、帧序列缓存 |
| `src/film.css` | 画面规范：颜色、字号阶梯、字幕卡、各镜头布局 |
| `public/site/` | cutcod.com 前台快照；`tools/film-shim.js` 让它离线、确定性运行 |
| `DIRECTION.md` | 影片方向与逐秒镜头表 |
| `templates/flagship-promo/` | 15 秒宣传模板，只用 CutCod 的配色、246 卡片和字号。不打开资源库，不改 `plan.json`。预览：`node templates/flagship-promo/preview.mjs` |
| `tools/score.py` | 配乐（120 BPM，F 大调，马林巴 + 拨弦低音 + 轻鼓） |
| `tools/cues.py` | 按 `plan.json` 动作生成音效 cue；`tools/mix_audio.py` 混音并让位 |

## 二次编辑

- **改文案**：编辑 `tools/make_plan.py` 里对应镜头的 `headlineEn` / `description`（网站镜头内的多条字幕在 `src/shots/sites.jsx` 的 `captions`），然后 `npm run plan && npm run film`。
- **改节奏/时长**：改 `tools/make_plan.py` 的 `start/end` 和动作 `at`，再同步 `src/shots/sites.jsx` 里该镜头的相机/光标/步骤时间（都是相对镜头开始的秒数），然后 `npm run plan && npm run film`。
- **改镜头运动**：`sites.jsx` 里 `cam: [{at, x, y, s}]` —— `x,y` 是网站 1440×900 坐标里要对准画面中心的点，`s` 是放大倍数（1.3334 = 整页铺满）。`node tools/measure.mjs` 可打印主要元素坐标。
- **改配色/字体**：`src/film.css` 顶部变量。
- **换配乐**：放入自己的 `assets/music.wav`（58 秒），或改 `tools/score.py` 后 `npm run music`；然后 `npm run film`。
- **改音效**：`tools/cues.py` 的 `MAP` / `GAIN`，然后 `npm run plan && npm run film`。
- **换产品**：`public/site/` 换成你的网页，按 `sites.jsx` 的写法改选择器与坐标。

改完分镜或配乐后必须重新混音（`npm run film` 已包含），导出时会核对音频与 `plan.json` 的哈希。

## 说明与限制

- 智能体窗口（24–30 秒）是示意画面，不是任何智能体产品的真实界面。
- 网站内容是 2026-10-08 的快照；线上 cutcod.com 之后的改动不会自动进入影片。
- 封面图和作品视频从原地址下载，原地址失效时 `npm run setup` 会报错，需要替换 `tools/fetch-media.mjs` 里的地址或文件。
- 不同系统的字体差异会让字形略有不同；渲染结果在 Windows 上验证过。
- 许可与素材来源见 `NOTICE.md`。
