---
layout: game
title: blog network
summary: >-
  an interactive network graph where posts are connected by shared tags.
  hover to explore, click to read, filter by tag.
element_tag: div
element_id: blog-network
element_class: blog-network embed-responsive-item
element_role: application
element_aria_label: Blog network graph visualization
aspect_ratio: embed-responsive-4by3
order: 8
full_width: true
full_height: true
---

(() => {
  const container = document.getElementById('blog-network');
  if (!container) return;

  const controller =
    window.createGamePanelController && typeof window.createGamePanelController === 'function'
      ? window.createGamePanelController(container)
      : null;

  const manageEvent = controller
    ? (target, type, handler, options) => controller.addManagedEvent(target, type, handler, options)
    : (target, type, handler, options) => {
        target.addEventListener(type, handler, options);
        return () => target.removeEventListener(type, handler, options);
      };

  const rawPosts = [
    {% for post in site.posts %}
      {
        title: {{ post.title | jsonify }},
        tags: {{ post.tags | jsonify }},
        url: {{ post.url | relative_url | jsonify }},
        date: {{ post.date | date: "%Y-%m-%d" | jsonify }},
        slug: {{ post.slug | jsonify }}
      }{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ];

  const posts = rawPosts
    .filter((p) => p && p.title && Array.isArray(p.tags) && p.tags.length > 0)
    .map((p) => ({
      id: p.slug || p.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      title: p.title,
      tags: p.tags.map((t) => String(t).toLowerCase().trim()),
      url: p.url || '#',
      date: p.date || '',
    }));

  container.textContent = '';

  if (posts.length === 0) {
    container.textContent = 'No posts found.';
    return;
  }

  const tagCounts = new Map();
  posts.forEach((p) =>
    p.tags.forEach((t) => tagCounts.set(t, (tagCounts.get(t) || 0) + 1))
  );

  posts.forEach((p) => {
    p.primaryTag = p.tags.reduce(
      (best, t) => ((tagCounts.get(t) || 0) > (tagCounts.get(best) || 0) ? t : best),
      p.tags[0]
    );
  });

  const tagColors = new Map();
  const palette = [
    '#1b4965', '#e07a5f', '#81b29a', '#f2cc8f', '#3d405b',
    '#d4a373', '#6d597a', '#b56576', '#355070', '#eaac8b',
    '#2a9d8f', '#e76f51', '#264653', '#a8dadc', '#457b9d',
    '#f4a261', '#8ecae6', '#e9c46a', '#219ebc', '#ffb703',
    '#023047', '#bc6c25', '#606c38', '#283618', '#dda15e',
    '#540b0e', '#9b2226', '#ae2012', '#bb3e03', '#ca6702',
    '#ee9b00', '#e9d8a6', '#94d2bd', '#0a9396', '#005f73',
    '#588157', '#3a5a40', '#a3b18a', '#dad7cd', '#6b705c',
    '#cb997e',
  ];
  const sortedTags = Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
  sortedTags.forEach((tag, i) => tagColors.set(tag, palette[i % palette.length]));

  const nodes = posts.map((p) => ({
    id: p.id,
    title: p.title,
    url: p.url,
    date: p.date,
    tags: p.tags,
    primaryTag: p.primaryTag,
    tagCount: p.tags.length,
  }));

  const links = [];
  const postIndex = new Map();
  posts.forEach((p) => postIndex.set(p.id, p));

  for (let i = 0; i < posts.length; i++) {
    for (let j = i + 1; j < posts.length; j++) {
      const shared = posts[i].tags.filter((t) => posts[j].tags.includes(t));
      if (shared.length >= 1) {
        links.push({
          source: posts[i].id,
          target: posts[j].id,
          weight: shared.length,
          sharedTags: shared,
        });
      }
    }
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'bn-wrapper';

  const controls = document.createElement('div');
  controls.className = 'bn-controls';

  const tagFilter = document.createElement('div');
  tagFilter.className = 'bn-tags';

  const resetBtn = document.createElement('button');
  resetBtn.className = 'bn-tag-pill bn-tag-pill--active';
  resetBtn.textContent = 'all';
  tagFilter.appendChild(resetBtn);

  sortedTags.forEach((tag) => {
    const pill = document.createElement('button');
    pill.className = 'bn-tag-pill';
    pill.textContent = tag;
    pill.style.setProperty('--tag-color', tagColors.get(tag));
    pill.dataset.tag = tag;
    tagFilter.appendChild(pill);
  });

  controls.appendChild(tagFilter);

  const tooltip = document.createElement('div');
  tooltip.className = 'bn-tooltip';
  tooltip.style.display = 'none';

  const graphContainer = document.createElement('div');
  graphContainer.className = 'bn-graph';

  wrapper.appendChild(controls);
  wrapper.appendChild(graphContainer);
  wrapper.appendChild(tooltip);
  container.appendChild(wrapper);

  const style = document.createElement('style');
  style.textContent = `
    .bn-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: #fdf6ee;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      position: relative;
      overflow: hidden;
    }
    html[data-theme="dark"] .bn-wrapper {
      background: #1a1208;
    }
    .bn-controls {
      padding: 12px 16px;
      overflow-x: auto;
      overflow-y: hidden;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(47, 29, 12, 0.1);
      -webkit-overflow-scrolling: touch;
    }
    html[data-theme="dark"] .bn-controls {
      border-bottom-color: rgba(251, 234, 211, 0.1);
    }
    .bn-tags {
      display: flex;
      gap: 6px;
      flex-wrap: nowrap;
      white-space: nowrap;
    }
    .bn-tag-pill {
      padding: 4px 12px;
      border-radius: 20px;
      border: 1.5px solid rgba(47, 29, 12, 0.2);
      background: transparent;
      color: #2f1d0c;
      font-size: 0.75rem;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      flex-shrink: 0;
    }
    html[data-theme="dark"] .bn-tag-pill {
      border-color: rgba(251, 234, 211, 0.2);
      color: #fbead3;
    }
    .bn-tag-pill:hover {
      background: rgba(47, 29, 12, 0.08);
    }
    html[data-theme="dark"] .bn-tag-pill:hover {
      background: rgba(251, 234, 211, 0.08);
    }
    .bn-tag-pill--active {
      background: #1b4965;
      color: #fff;
      border-color: #1b4965;
    }
    html[data-theme="dark"] .bn-tag-pill--active {
      background: #e07a5f;
      border-color: #e07a5f;
      color: #1a1208;
    }
    .bn-graph {
      flex: 1;
      min-height: 0;
      position: relative;
    }
    .bn-graph svg {
      width: 100%;
      height: 100%;
      display: block;
    }
    .bn-tooltip {
      position: absolute;
      pointer-events: none;
      background: #fff;
      border: 1px solid rgba(47, 29, 12, 0.15);
      border-radius: 8px;
      padding: 12px 16px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.12);
      max-width: 280px;
      z-index: 10;
      font-size: 0.82rem;
      line-height: 1.4;
      color: #2f1d0c;
    }
    html[data-theme="dark"] .bn-tooltip {
      background: #2a1a0a;
      border-color: rgba(251, 234, 211, 0.15);
      color: #fbead3;
    }
    .bn-tooltip__title {
      font-weight: 700;
      font-size: 0.9rem;
      margin-bottom: 4px;
    }
    .bn-tooltip__date {
      color: rgba(47, 29, 12, 0.6);
      font-size: 0.75rem;
      margin-bottom: 6px;
    }
    html[data-theme="dark"] .bn-tooltip__date {
      color: rgba(251, 234, 211, 0.5);
    }
    .bn-tooltip__tags {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .bn-tooltip__tag {
      display: inline-block;
      padding: 1px 8px;
      border-radius: 10px;
      font-size: 0.7rem;
      font-weight: 500;
      background: rgba(47, 29, 12, 0.08);
    }
    html[data-theme="dark"] .bn-tooltip__tag {
      background: rgba(251, 234, 211, 0.1);
    }
  `;
  container.appendChild(style);

  function loadD3() {
    return new Promise((resolve, reject) => {
      if (window.d3) {
        resolve(window.d3);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.onload = () => resolve(window.d3);
      script.onerror = () => reject(new Error('Failed to load D3'));
      document.head.appendChild(script);
    });
  }

  loadD3().then((d3) => {
    const rect = graphContainer.getBoundingClientRect();
    let width = rect.width || 800;
    let height = rect.height || 600;

    const svg = d3
      .select(graphContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g');

    const zoom = d3
      .zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const minR = 4;
    const maxR = 14;
    const tagCountExtent = d3.extent(nodes, (d) => d.tagCount);
    const radiusScale = d3
      .scaleSqrt()
      .domain(tagCountExtent)
      .range([minR, maxR]);

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => (d.weight === 1 ? 200 : 100 / d.weight))
          .strength((d) => (d.weight === 1 ? 0.02 : Math.min(d.weight * 0.12, 0.8)))
      )
      .force('charge', d3.forceManyBody().strength(-120).distanceMax(350))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force(
        'collide',
        d3.forceCollide().radius((d) => radiusScale(d.tagCount) + 3)
      )
      .alphaDecay(0.02);

    const link = g
      .append('g')
      .attr('class', 'bn-links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', 'rgba(47, 29, 12, 0.08)')
      .attr('stroke-width', (d) => (d.weight === 1 ? 0.3 : Math.max(0.8, d.weight * 0.7)))
      .attr('opacity', (d) => (d.weight === 1 ? 0.3 : 1));

    const node = g
      .append('g')
      .attr('class', 'bn-nodes')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('r', (d) => radiusScale(d.tagCount))
      .attr('fill', (d) => tagColors.get(d.primaryTag) || '#1b4965')
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)
      .attr('cursor', 'pointer')
      .attr('opacity', 0.85);

    const isDark = () =>
      document.documentElement.getAttribute('data-theme') === 'dark';

    function updateThemeColors() {
      const dark = isDark();
      link.attr('stroke', dark ? 'rgba(251, 234, 211, 0.08)' : 'rgba(47, 29, 12, 0.08)');
      node.attr('stroke', dark ? '#2a1a0a' : '#fff');
    }

    const themeObserver = new MutationObserver(updateThemeColors);
    themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    updateThemeColors();

    let activeTag = null;

    function highlightTag(tag) {
      activeTag = tag;
      if (!tag) {
        node.attr('opacity', 0.85);
        link.attr('opacity', (d) => (d.weight === 1 ? 0.3 : 1));
        tagFilter.querySelectorAll('.bn-tag-pill').forEach((p) => {
          p.classList.toggle('bn-tag-pill--active', !p.dataset.tag);
        });
        return;
      }
      tagFilter.querySelectorAll('.bn-tag-pill').forEach((p) => {
        p.classList.toggle('bn-tag-pill--active', p.dataset.tag === tag);
      });
      node.attr('opacity', (d) => (d.tags.includes(tag) ? 1 : 0.07));
      link.attr('opacity', (d) => {
        const s = typeof d.source === 'object' ? d.source : postIndex.get(d.source);
        const t = typeof d.target === 'object' ? d.target : postIndex.get(d.target);
        return s && t && s.tags && t.tags && s.tags.includes(tag) && t.tags.includes(tag) ? 1 : 0.02;
      });
    }

    manageEvent(resetBtn, 'click', () => highlightTag(null));
    tagFilter.querySelectorAll('.bn-tag-pill[data-tag]').forEach((pill) => {
      manageEvent(pill, 'click', () => {
        highlightTag(pill.dataset.tag === activeTag ? null : pill.dataset.tag);
      });
    });

    function esc(s) {
      const el = document.createElement('span');
      el.textContent = s;
      return el.innerHTML;
    }

    function showTooltip(event, d) {
      const tagsHtml = d.tags
        .map((t) => `<span class="bn-tooltip__tag" style="border-left: 3px solid ${tagColors.get(t) || '#999'}">${esc(t)}</span>`)
        .join('');
      tooltip.innerHTML = `
        <div class="bn-tooltip__title">${esc(d.title)}</div>
        <div class="bn-tooltip__date">${esc(d.date)}</div>
        <div class="bn-tooltip__tags">${tagsHtml}</div>
      `;
      tooltip.style.display = 'block';
      positionTooltip(event);
    }

    function positionTooltip(event) {
      const cr = container.getBoundingClientRect();
      let x = event.clientX - cr.left + 14;
      let y = event.clientY - cr.top + 14;
      const tw = tooltip.offsetWidth;
      const th = tooltip.offsetHeight;
      if (x + tw > cr.width - 8) x = event.clientX - cr.left - tw - 14;
      if (y + th > cr.height - 8) y = event.clientY - cr.top - th - 14;
      tooltip.style.left = x + 'px';
      tooltip.style.top = y + 'px';
    }

    function hideTooltip() {
      tooltip.style.display = 'none';
    }

    let hoveredNode = null;

    node
      .on('mouseenter', function (event, d) {
        hoveredNode = d;
        showTooltip(event, d);
        const neighbors = new Set();
        links.forEach((l) => {
          const sid = typeof l.source === 'object' ? l.source.id : l.source;
          const tid = typeof l.target === 'object' ? l.target.id : l.target;
          if (sid === d.id) neighbors.add(tid);
          if (tid === d.id) neighbors.add(sid);
        });
        neighbors.add(d.id);
        if (!activeTag) {
          node.attr('opacity', (n) => (neighbors.has(n.id) ? 1 : 0.12));
          link.attr('opacity', (l) => {
            const sid = typeof l.source === 'object' ? l.source.id : l.source;
            const tid = typeof l.target === 'object' ? l.target.id : l.target;
            return sid === d.id || tid === d.id ? 0.6 : 0.02;
          });
          const dark = isDark();
          link
            .attr('stroke', (l) => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              const tid = typeof l.target === 'object' ? l.target.id : l.target;
              if (sid === d.id || tid === d.id)
                return dark ? 'rgba(251, 234, 211, 0.5)' : 'rgba(47, 29, 12, 0.35)';
              return dark ? 'rgba(251, 234, 211, 0.08)' : 'rgba(47, 29, 12, 0.08)';
            })
            .attr('stroke-width', (l) => {
              const sid = typeof l.source === 'object' ? l.source.id : l.source;
              const tid = typeof l.target === 'object' ? l.target.id : l.target;
              return sid === d.id || tid === d.id
                ? Math.max(1.5, l.weight * 1.2)
                : Math.max(0.5, l.weight * 0.6);
            });
        }
        d3.select(this)
          .attr('stroke-width', 2.5)
          .attr('opacity', 1)
          .raise();
      })
      .on('mousemove', (event) => positionTooltip(event))
      .on('mouseleave', function (event, d) {
        hoveredNode = null;
        hideTooltip();
        if (!activeTag) {
          node.attr('opacity', 0.85);
          const dark = isDark();
          link
            .attr('opacity', (l) => (l.weight === 1 ? 0.3 : 1))
            .attr('stroke', dark ? 'rgba(251, 234, 211, 0.08)' : 'rgba(47, 29, 12, 0.08)')
            .attr('stroke-width', (l) => (l.weight === 1 ? 0.3 : Math.max(0.8, l.weight * 0.7)));
        } else {
          highlightTag(activeTag);
        }
        d3.select(this).attr('stroke-width', 1);
      })
      .on('click', (event, d) => {
        window.open(d.url, '_blank');
      });

    node.call(
      d3
        .drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
    );

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
    });

    function handleResize() {
      const r = graphContainer.getBoundingClientRect();
      width = r.width || 800;
      height = r.height || 600;
      svg.attr('width', width).attr('height', height);
      simulation.force('center', d3.forceCenter(width / 2, height / 2));
      simulation.alpha(0.3).restart();
    }

    manageEvent(window, 'resize', handleResize);

    if (controller) {
      controller.onChange((active) => {
        if (active) {
          simulation.alpha(0.3).restart();
        } else {
          simulation.stop();
        }
      });
    }

    svg.call(zoom.transform, d3.zoomIdentity.translate(width * 0.05, height * 0.05).scale(0.9));
  });
})();
