---
title: 技术雷达
type: tech-radar
comments: false
---

<div id="tech-radar-plot" style="max-width: 800px; margin: 0 auto;"></div>

<script src="https://d3js.org/d3.v7.min.js"></script>
<script src="/js/tech-radar.js"></script>

<style>
.tech-radar-svg {
  width: 100%;
  height: auto;
  max-width: 800px;
}

.radar-dot circle {
  cursor: pointer;
  transition: all 0.2s;
}

.radar-dot:hover circle {
  r: 12;
  opacity: 1;
}

.radar-dot:hover .dot-label {
  font-weight: bold;
}

[data-theme='dark'] .quadrant-label {
  fill: #bdbbff !important;
}

[data-theme='dark'] .ring-label {
  opacity: 0.8;
}

[data-theme='dark'] .radar-dot circle {
  stroke: #1a1a2e;
}
</style>

## 说明

技术雷达分为四个象限：
- **语言 & 框架**：编程语言和开发框架
- **基础设施**：数据库、中间件、云平台
- **工具**：开发工具、AI 助手
- **方法论**：架构模式、开发实践

四个环表示采纳程度：
- 🟢 **Adopt（采纳）**：已在生产环境大规模使用
- 🔵 **Trial（试用）**：在项目中试点，有明确应用场景
- 🟠 **Assess（评估）**：正在调研，尚未实际应用
- 🔴 **Hold（暂缓）**：不推荐新项目使用
