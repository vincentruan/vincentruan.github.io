# Tech Radar 方案

## 一、现状分析

| 项目 | 当前状态 |
|------|---------|
| 源码分支 | `hexo`（活跃） |
| 废弃分支 | `master`（2020 年编译产物） |
| 部署方式 | GitHub Actions: `hexo` → `upload-pages-artifact` → Pages |
| 主题 | NexT 8.28.0 |
| Hexo | 7.3.0 |
| 部署插件 | `hexo-deployer-git`（已不再使用，可清理） |

## 二、分支策略

### 结论：保持 `hexo` 分支不变

当前 Actions 已稳定运行，迁移到 `main` 收益不大，反而有破坏风险。

### 清理计划

```bash
# 删除本地和远程的 master 分支（2020 年废弃产物）
git branch -D master
git push origin --delete master

# 可选：清理 hexo-deployer-git 依赖（已不再使用）
npm uninstall hexo-deployer-git
```

### 开发流程

```
hexo (源码) ──push──→ Actions 构建 ──→ GitHub Pages
  ↑
  └── feature/tech-radar (开发分支，PR 合并)
```

## 三、Tech Radar 实现方案

### 方案 A：D3.js 交互式雷达（推荐）

**原理**：在 Hexo 页面中嵌入 D3.js 渲染的四象限雷达图，数据由 JSON 驱动。

**优势**：
- 交互性强（hover 显示详情、点击跳转文章）
- 数据驱动，修改 JSON 即可更新
- 参考实现成熟（Zalando Tech Radar）
- 与 NexT 主题兼容（纯前端渲染，不侵入主题）

**实现步骤**：

1. **添加数据文件** `source/data/tech-radar.json`
```json
{
  "date": "2026-07",
  "quadrants": {
    "languages": "语言 & 框架",
    "infrastructure": "基础设施",
    "tools": "工具",
    "techniques": "方法论"
  },
  "rings": {
    "adopt": "采纳",
    "trial": "试用",
    "assess": "评估",
    "hold": "暂缓"
  },
  "items": [
    {
      "name": "Rust",
      "quadrant": "languages",
      "ring": "adopt",
      "moved": 0,
      "description": "高性能系统编程，用于核心引擎",
      "link": "/2026/07/15/claude-code-design-art/"
    },
    {
      "name": "Go",
      "quadrant": "languages",
      "ring": "trial",
      "moved": 1,
      "description": "云原生微服务，正在迁移"
    }
  ]
}
```

2. **添加前端脚本** `source/js/tech-radar.js`
   - 基于 D3.js v7 渲染四象限气泡图
   - 从 `/data/tech-radar.json` 加载数据
   - 响应式适配，支持暗色主题

3. **创建页面** `source/tech-radar/index.md`
```markdown
---
title: 技术雷达
type: tech-radar
---
<div id="tech-radar-plot"></div>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/tech-radar.js"></script>
```

4. **NexT 主题适配**
   - 在 `_config.next.yml` 中注入自定义 CSS
   - 雷达图容器自适应宽度
   - 暗色模式跟随主题切换

**新增依赖**：
```json
{
  "dependencies": {
    // 无新增 npm 依赖，D3 通过 CDN 加载
  }
}
```

**新增文件**：
```
source/
├── data/
│   └── tech-radar.json      # 雷达数据
├── js/
│   └── tech-radar.js        # D3 渲染逻辑
└── tech-radar/
    └── index.md             # 雷达页面
```

---

### 方案 B：GitHub 数据自动生成

**原理**：用 GitHub Actions 定时抓取你的 GitHub 数据（语言分布、star 趋势、贡献图），自动生成雷达数据。

**优势**：
- 数据来自真实使用，不需要手动维护
- 可展示 GitHub 活跃度、项目 star 趋势
- 与方案 A 互补，作为数据源

**实现步骤**：

1. **新增 workflow** `.github/workflows/update-radar.yml`
```yaml
name: Update Tech Radar Data

on:
  schedule:
    - cron: '0 0 1 * *'  # 每月 1 号
  workflow_dispatch:

jobs:
  update:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          ref: hexo
      
      - name: Fetch GitHub stats
        run: node scripts/fetch-github-stats.js
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Update radar data
        run: node scripts/generate-radar-data.js
      
      - name: Commit & Push
        run: |
          git config user.name "github-actions"
          git config user.email "actions@github.com"
          git add source/data/tech-radar.json
          git diff --staged --quiet || git commit -m "chore: auto-update tech radar data"
          git push
```

2. **新增脚本**
```
scripts/
├── fetch-github-stats.js     # 抓取 GitHub API 数据
└── generate-radar-data.js    # 生成雷达 JSON
```

3. **抓取数据**：
   - 语言分布（`/users/{user}/repos` → 统计各语言占比）
   - Starred repos（`/users/{user}/starred` → 按分类统计）
   - 贡献频率（GraphQL API）

---

## 四、推荐实施顺序

### Phase 1：基础搭建（方案 A）
1. 创建 `source/tech-radar/index.md` 页面
2. 编写 D3 渲染脚本 `source/js/tech-radar.js`
3. 准备初始数据 `source/data/tech-radar.json`
4. 本地验证 `hexo server`
5. 提交 PR → 合并 → 自动部署

### Phase 2：数据自动化（方案 B）
1. 编写 GitHub API 抓取脚本
2. 配置定时 workflow
3. 将自动数据与手动评估合并

### Phase 3：增强
1. 菜单集成（NexT 导航栏添加"技术雷达"入口）
2. 历史版本（按季度归档）
3. 每个技术项链接到详细文章

## 五、NexT 主题集成

**导航栏添加入口**（`_config.next.yml`）：
```yaml
menu:
  home: / || home
  archives: /archives/ || archive
  tech-radar: /tech-radar/ || radar-chart  # 新增
  about: /about/ || user
```

**暗色模式适配**：
```css
/* 在 source/css/_custom/custom.styl 中添加 */
[data-theme='dark'] #tech-radar-plot {
  .quadrant-label { fill: #bdbbff; }
  .ring-label { fill: rgba(255,255,255,0.6); }
  .dot-adopt { fill: #7cfc00; }
  .dot-trial { fill: #bdbbff; }
  .dot-assess { fill: #ffa500; }
  .dot-hold { fill: #ff6b6b; }
}
```

## 六、风险评估

| 风险 | 影响 | 缓解 |
|------|------|------|
| D3 CDN 不可用 | 雷达图不渲染 | 降级显示 JSON 数据列表 |
| NexT 主题升级冲突 | 自定义 CSS 失效 | 用 `_custom/custom.styl` 隔离 |
| 数据格式变更 | 历史数据不兼容 | JSON schema 版本化 |
| 删除 master 分支 | 误删 | 先确认无未合并改动 |
