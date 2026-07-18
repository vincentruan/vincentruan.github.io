# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A personal blog built on **Hexo 7.3.0** with the **NexT 8.28.0** theme, deployed to GitHub Pages (`vincentruan.github.io`) via GitHub Actions. The site is in Simplified Chinese (`language: zh-CN`, `timezone: Asia/Shanghai`). Posts live in `source/_posts/` organized into category subfolders (`source/_posts/<category>/` - 58 posts across 14 categories); most content is pre-existing tech writing — be careful not to alter existing post prose unless asked.

## Commands

```bash
npm run server      # hexo server — local dev server at http://localhost:4000
npm run build       # hexo generate — build static site into public/
npm run clean       # hexo clean — remove public/, db.json, cache
npm run deploy      # hexo deploy — NOT USED; deployment is via GitHub Actions (see below)

# Create a new post (post_asset_folder is enabled, so a same-named asset folder is auto-created)
npx hexo new "Post Title"

# Create a draft, then publish
npx hexo new draft "Title"
npx hexo publish "Title"
```

There are **no tests and no linter** configured. Verification = `npm run build` succeeds and `npm run server` renders correctly.

## Deployment

Pushing to `main` triggers `.github/workflows/deploy.yml`, which runs `npm ci` → `hexo generate` → uploads `public/` as a Pages artifact → deploys via the official Pages action. There is no manual deploy step; `hexo-deployer-git` was a leftover dependency and has been removed. The workflow pins `node-version: '22'` and uses `actions/checkout@v5`, `actions/setup-node@v5`, `actions/upload-pages-artifact@v4`, `actions/deploy-pages@v5` (Node-24 runtime actions to avoid GitHub's Node-20 deprecation).

`public/` and `db.json` are gitignored — they are build outputs, do not commit them.

## Configuration: two-file split

Hexo config and NexT theme config are deliberately separated:

- **`_config.yml`** — Hexo site config (site metadata, URL, permalink, generator plugins, live2d, sitemap, search, marked renderer settings).
- **`_config.next.yml`** — NexT theme override config (menu, sidebar, comments, math, mermaid, motion, canvas-nest). This uses NexT's "alternate theme config" feature: a file named `_config.next.yml` in the project root automatically overrides the theme's own `_config.yml`.

When changing theme behavior, edit `_config.next.yml`, not `themes/next/_config.yml`. `theme: next` in `_config.yml` resolves to the `hexo-theme-next` npm package, not a `themes/next/` folder. (The unused `themes/` directory containing old `hueman`/`landscape`/`yilia` themes was removed during a Dependabot cleanup — those themes' `package.json` files were pulling in vulnerable transitive deps.)

## Custom features (not standard Hexo/NexT)

### Tech Radar (`source/tech-radar/`)
A D3.js four-quadrant tech-radar page. Architecture:
- `source/data/tech-radar.json` — single source of truth; edit this to update the radar (no code change needed).
- `source/js/tech-radar.js` — IIFE that fetches the JSON at runtime and renders an SVG radar via D3 v7 (loaded from CDN in `index.md`).
- `source/tech-radar/index.md` — page with `type: tech-radar`, inline `<style>` for dark-mode adaptation.

The radar reads CSS variables (`--text-color`, `--border-color`) to follow NexT's dark mode. To add a tech item, append to `items[]` in the JSON with `quadrant` ∈ {languages, infrastructure, tools, techniques} and `ring` ∈ {adopt, trial, assess, hold}. `docs/tech-radar-plan.md` has the original design doc and an unimplemented Phase 2 (GitHub-data auto-generation).

### Asset prefix stripper (`scripts/strip-asset-prefix.js`)
A `before_post_render` filter that strips the leading `<PostName>/` from markdown image links, so source `.md` files can reference assets as `![](My Post/image.png)` (renders on GitHub/preview) while the renderer still receives the bare `image.png` form that `postAsset` + the asset path fixer below expect. Runs before the asset path fixer in the pipeline.

### Asset path fixer (`scripts/fix-asset-paths.js`)
An `after_render:html` filter that rewrites broken `<img src="/.io//filename">` paths (a `hexo-renderer-marked` + `post_asset_folder` bug) back to correct asset paths by looking up `PostAsset` records. If you touch the marked renderer config or asset handling and images break differently, this script is the place to adjust.

### Live2D widget
`hexo-helper-live2d` renders a `xiaomai` model from `live2d_models/xiaomai/` (config in `_config.yml` under `live2d:`). `mobile.show: false`. Disabled by setting `live2d.enable: false`.

## Posts & asset folders

`post_asset_folder: true` in `_config.yml` means each post can have a sibling folder of the same basename (minus `.md`) holding its images, e.g. `source/_posts/Java/My Post.md` + `source/_posts/Java/My Post/image.png`. Reference images in posts with `![](My Post/image.png)` - the folder prefix (the post's own basename) lets the `.md` render correctly on GitHub/editors; `scripts/strip-asset-prefix.js` strips that prefix at render time so the `marked` config (`prependRoot: true`, `postAsset: true`) still produces the correct `/{permalink}/image.png` deploy URL.

Post front-matter convention (from scaffolds):
```yaml
---
title: Title
date: YYYY-MM-DD HH:mm:ss
categories: cat
tags:
- tag1
---
```
Use `<!-- more -->` to set the excerpt break on the index page. Permalink pattern is `:year/:month/:day/:name/` - uses `:name` (filename only), not `:title`, because posts live in category subfolders and `:title` would inject the subfolder name into the URL; `:name` keeps URLs stable when posts move between folders.

## Security note

`_config.next.yml` contains a **Gitalk OAuth `client_secret` in plaintext** (committed). This is a known limitation of Gitalk's static-site deployment model. Do not add other secrets to committed config; if asked to add API keys, use GitHub Actions secrets or environment injection instead.

## Operational state

The `.omc/` directory holds oh-my-claudecode orchestration state and is **not currently gitignored** — avoid committing it. (`.gitignore` covers `db.json`, `node_modules/`, `public/`, `.deploy*/`.)
