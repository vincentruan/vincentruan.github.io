// Tech Radar - D3.js 实现
(function() {
  'use strict';

  const CONFIG = {
    width: 800,
    height: 800,
    padding: 80,
    rings: [
      { name: 'adopt', color: '#7cfc00', radius: 0.25 },
      { name: 'trial', color: '#bdbbff', radius: 0.5 },
      { name: 'assess', color: '#ffa500', radius: 0.75 },
      { name: 'hold', color: '#ff6b6b', radius: 1.0 }
    ],
    quadrants: [
      { name: 'languages', angle: 0 },
      { name: 'infrastructure', angle: 90 },
      { name: 'tools', angle: 180 },
      { name: 'techniques', angle: 270 }
    ]
  };

  function initRadar() {
    const container = document.getElementById('tech-radar-plot');
    if (!container) return;

    // 加载数据
    fetch('/data/tech-radar.json')
      .then(r => r.json())
      .then(data => renderRadar(container, data))
      .catch(err => {
        console.error('Failed to load tech radar data:', err);
        container.innerHTML = '<p style="color: #999;">技术雷达数据加载失败</p>';
      });
  }

  function renderRadar(container, data) {
    const svg = d3.select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${CONFIG.width} ${CONFIG.height}`)
      .attr('class', 'tech-radar-svg');

    const cx = CONFIG.width / 2;
    const cy = CONFIG.height / 2;
    const maxRadius = (CONFIG.width - CONFIG.padding * 2) / 2;

    // 绘制圆环
    CONFIG.rings.forEach((ring, i) => {
      const r = maxRadius * ring.radius;
      svg.append('circle')
        .attr('cx', cx)
        .attr('cy', cy)
        .attr('r', r)
        .attr('fill', 'none')
        .attr('stroke', 'var(--border-color, #ddd)')
        .attr('stroke-width', 1)
        .attr('opacity', 0.5);

      // 环标签
      svg.append('text')
        .attr('x', cx + r + 5)
        .attr('y', cy - 5)
        .attr('class', 'ring-label')
        .text(ring.name.toUpperCase())
        .attr('fill', ring.color)
        .attr('font-size', '12px')
        .attr('font-weight', 'bold');
    });

    // 绘制象限分割线
    svg.append('line')
      .attr('x1', cx - maxRadius)
      .attr('y1', cy)
      .attr('x2', cx + maxRadius)
      .attr('y2', cy)
      .attr('stroke', 'var(--border-color, #ddd)')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    svg.append('line')
      .attr('x1', cx)
      .attr('y1', cy - maxRadius)
      .attr('x2', cx)
      .attr('y2', cy + maxRadius)
      .attr('stroke', 'var(--border-color, #ddd)')
      .attr('stroke-width', 1)
      .attr('opacity', 0.5);

    // 象限标签
    const quadrantLabels = [
      { name: data.quadrants.languages, x: cx + maxRadius * 0.5, y: cy - maxRadius * 0.5 },
      { name: data.quadrants.infrastructure, x: cx + maxRadius * 0.5, y: cy + maxRadius * 0.5 },
      { name: data.quadrants.tools, x: cx - maxRadius * 0.5, y: cy + maxRadius * 0.5 },
      { name: data.quadrants.techniques, x: cx - maxRadius * 0.5, y: cy - maxRadius * 0.5 }
    ];

    quadrantLabels.forEach(ql => {
      svg.append('text')
        .attr('x', ql.x)
        .attr('y', ql.y)
        .attr('text-anchor', 'middle')
        .attr('class', 'quadrant-label')
        .text(ql.name)
        .attr('fill', 'var(--text-color, #333)')
        .attr('font-size', '14px')
        .attr('font-weight', 'bold');
    });

    // 绘制技术点
    const items = data.items || [];
    const ringMap = {};
    CONFIG.rings.forEach(r => ringMap[r.name] = r);

    // 按象限分组，避免重叠
    const quadrantItems = {};
    CONFIG.quadrants.forEach(q => quadrantItems[q.name] = []);
    items.forEach(item => {
      if (quadrantItems[item.quadrant]) {
        quadrantItems[item.quadrant].push(item);
      }
    });

    // 计算位置
    const positions = [];
    Object.keys(quadrantItems).forEach(quadrant => {
      const qItems = quadrantItems[quadrant];
      const qConfig = CONFIG.quadrants.find(q => q.name === quadrant);
      const baseAngle = qConfig.angle;

      qItems.forEach((item, i) => {
        const ring = ringMap[item.ring];
        if (!ring) return;

        // 在象限内均匀分布
        const angleOffset = (i + 0.5) / qItems.length * 90 - 45;
        const angle = (baseAngle + angleOffset) * Math.PI / 180;
        const radius = maxRadius * ring.radius * 0.8;

        positions.push({
          item: item,
          x: cx + radius * Math.cos(angle),
          y: cy - radius * Math.sin(angle),
          ring: ring
        });
      });
    });

    // 绘制气泡
    const dots = svg.selectAll('.radar-dot')
      .data(positions)
      .enter()
      .append('g')
      .attr('class', 'radar-dot')
      .attr('transform', d => `translate(${d.x}, ${d.y})`);

    dots.append('circle')
      .attr('r', 8)
      .attr('fill', d => d.ring.color)
      .attr('opacity', 0.8)
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    dots.append('text')
      .attr('x', 12)
      .attr('y', 4)
      .attr('class', 'dot-label')
      .text(d => d.item.name)
      .attr('fill', 'var(--text-color, #333)')
      .attr('font-size', '11px');

    // Tooltip
    dots.append('title')
      .text(d => `${d.item.name}\n${d.item.description || ''}`);
  }

  // 页面加载完成后初始化
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initRadar);
  } else {
    initRadar();
  }
})();
