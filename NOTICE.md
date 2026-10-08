# 许可与来源说明

## 工程代码
- 起步工程代码（`build.mjs`、`render.mjs`、`stills.mjs`、`preview.mjs`、`server.mjs`、`src/engine.js`、`src/film-store.js`、`src/fake-api.js`、`src/kit/cursor.jsx|interact.js|measure.js|text.jsx`、`src/adapters/`）以及 `tools/mix_audio.py`、`tools/check_delivery.py` 来自 [归藏 product video skill](https://github.com/op7418/guizang-product-video-skill)，Copyright © 2026 op7418，采用 GNU AGPL-3.0（见 `LICENSE`）。
- 本片在此基础上新增的镜头、相机、网站驱动、配乐脚本（`src/shots/`、`src/kit/site.js`、`src/kit/siteShot.jsx`、`src/film.css`、`tools/*.py|*.mjs|film-shim.js`）随本仓库同样以 AGPL-3.0 提供。

## 网站快照 `public/site/`
cutcod.com 前台页面（HTML/CSS/JS）与公开资源目录的快照，抓取于 2026-10-08，版权归 CutCod。仅用于让影片里的真实网站离线运行，相对线上版的改动：
- 去掉 CloudBase SDK，注入 `film-shim.js`（固定时钟、离线接口、冻结 CSS 动画、由影片时钟绘制视频帧）；
- `api/resources.json` 只保留展示所需字段，去掉作者账号 ID、审核备注等后台字段；仅保留影片打开的两条作品的复制内容；
- `cloudbase-config.js` 置空。

## 不随仓库分发、由 `npm run setup` 从原地址下载的素材
- 资源目录封面图：`https://cutcod.com/assets/posters/…`（各作品封面，版权归原作者/CutCod）。
- 片中播放的 4 段作品视频（见 `tools/fetch-media.mjs` 的 `CLIPS`）：CutCod 站内的「UI Morph 交互动效」「Higgsfield产品动画」，以及 skillry.dev 上的「Liquid Glass Product Film」、「真实产品宣传片 Skill」示例片。它们只作为"资源库里的作品"出现在画面中，版权归原作者。

## 声音
- `assets/music.wav`：由 `tools/score.py` 代码原创合成（固定随机种子，可重新生成），无采样。
- `assets/sfx/*.wav`：归藏 skill 内置的原创合成音效，来源见 `assets/sfx/SOURCE.txt`。

## 字体
不打包字体。使用系统字体：中文 PingFang SC → Noto Sans SC → Microsoft YaHei；英文 Segoe UI → Helvetica Neue → Arial。
