---
layout: game
title: blog viewer
summary: >-
  trace your posts through a living tag graph. tap a node to focus and follow
  the threads between ideas.
element_tag: div
element_id: blog-viewer
element_class: blog-viewer embed-responsive-item
element_role: application
element_aria_label: Blog viewer graph prototype
aspect_ratio: embed-responsive-4by3
order: 7
full_width: true
full_height: true
---

(() => {
  const container = document.getElementById('blog-viewer');
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
        excerpt: {{ post.excerpt | strip_html | strip_newlines | truncate: 140 | jsonify }},
        preview: {{ post.content | strip_html | strip_newlines | truncate: 260 | jsonify }}
      }{% unless forloop.last %},{% endunless %}
    {% endfor %}
  ];

  const posts = rawPosts
    .filter((post) => post && post.title)
    .map((post) => ({
      title: post.title,
      tags: Array.isArray(post.tags) && post.tags.length > 0 ? post.tags : ['untagged'],
      url: post.url || '#',
      date: post.date || '',
      excerpt: post.excerpt || '',
      preview: post.preview || post.excerpt || '',
    }));

  container.textContent = '';

  if (posts.length === 0) {
    container.textContent = 'No posts found for the graph.';
    return;
  }

  const frame = document.createElement('div');
  frame.className = 'blog-viewer__frame';

  const header = document.createElement('header');
  header.className = 'blog-viewer__header';
  const title = document.createElement('h2');
  title.className = 'blog-viewer__title';
  title.textContent = 'blog viewer';
  const subtitle = document.createElement('p');
  subtitle.className = 'blog-viewer__subtitle';
  subtitle.textContent = 'a constellation of posts connected by shared tags';
  const stats = document.createElement('div');
  stats.className = 'blog-viewer__stats';
  header.appendChild(title);
  header.appendChild(subtitle);
  header.appendChild(stats);

  const graph = document.createElement('div');
  graph.className = 'blog-viewer__graph';
  graph.setAttribute('role', 'application');
  graph.setAttribute('aria-label', 'Interactive blog tag graph');

  const edges = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  edges.classList.add('blog-viewer__edges');
  edges.setAttribute('aria-hidden', 'true');
  edges.setAttribute('focusable', 'false');

  const nodesLayer = document.createElement('div');
  nodesLayer.className = 'blog-viewer__nodes';

  const hint = document.createElement('div');
  hint.className = 'blog-viewer__hint';
  hint.textContent = 'drag nodes, click to focus';

  graph.appendChild(edges);
  graph.appendChild(nodesLayer);
  graph.appendChild(hint);

  const footer = document.createElement('div');
  footer.className = 'blog-viewer__footer';

  const legend = document.createElement('div');
  legend.className = 'blog-viewer__legend';
  legend.innerHTML = `
    <span class="blog-viewer__legend-item blog-viewer__legend-item--post">post</span>
    <span class="blog-viewer__legend-item blog-viewer__legend-item--tag">tag</span>
  `;

  const details = document.createElement('div');
  details.className = 'blog-viewer__details';
  const detailsLabel = document.createElement('p');
  detailsLabel.className = 'blog-viewer__details-label';
  detailsLabel.textContent = 'focused node';
  const detailsTitle = document.createElement('h3');
  detailsTitle.className = 'blog-viewer__details-title';
  const detailsMeta = document.createElement('p');
  detailsMeta.className = 'blog-viewer__details-meta';
  const detailsBody = document.createElement('p');
  detailsBody.className = 'blog-viewer__details-body';
  const detailsTagsLabel = document.createElement('p');
  detailsTagsLabel.className = 'blog-viewer__details-subtitle';
  const detailsTagsList = document.createElement('div');
  detailsTagsList.className = 'blog-viewer__details-list';
  const detailsRelatedLabel = document.createElement('p');
  detailsRelatedLabel.className = 'blog-viewer__details-subtitle';
  const detailsRelatedList = document.createElement('div');
  detailsRelatedList.className = 'blog-viewer__details-list blog-viewer__details-list--related';
  const detailsLink = document.createElement('a');
  detailsLink.className = 'blog-viewer__details-link';
  detailsLink.textContent = 'open post';
  detailsLink.setAttribute('rel', 'noopener');
  details.appendChild(detailsLabel);
  details.appendChild(detailsTitle);
  details.appendChild(detailsMeta);
  details.appendChild(detailsBody);
  details.appendChild(detailsTagsLabel);
  details.appendChild(detailsTagsList);
  details.appendChild(detailsRelatedLabel);
  details.appendChild(detailsRelatedList);
  details.appendChild(detailsLink);

  footer.appendChild(legend);
  footer.appendChild(details);

  frame.appendChild(header);
  frame.appendChild(graph);
  frame.appendChild(footer);
  container.appendChild(frame);

  const tagMap = new Map();
  const nodes = [];
  const links = [];
  const adjacency = new Map();
  const tagToPosts = new Map();

  function normalizeTag(tag) {
    return String(tag || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }

  function addAdjacency(a, b) {
    if (!adjacency.has(a)) adjacency.set(a, new Set());
    adjacency.get(a).add(b);
  }

  posts.forEach((post, index) => {
    const postNode = {
      id: `post-${index}`,
      type: 'post',
      label: post.title,
      url: post.url,
      date: post.date,
      excerpt: post.excerpt,
      tags: post.tags,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      degree: 0,
      dragging: false,
    };
    nodes.push(postNode);

    post.tags.forEach((tag) => {
      const tagKey = normalizeTag(tag) || `tag-${tagMap.size}`;
      let tagNode = tagMap.get(tagKey);
      if (!tagNode) {
        tagNode = {
          id: `tag-${tagKey}`,
          type: 'tag',
          label: tag,
          x: 0,
          y: 0,
          vx: 0,
          vy: 0,
          degree: 0,
          dragging: false,
        };
        tagMap.set(tagKey, tagNode);
        nodes.push(tagNode);
      }
      links.push({
        source: postNode,
        target: tagNode,
        strength: 1,
      });
      postNode.degree += 1;
      tagNode.degree += 1;
      if (!tagToPosts.has(tagNode.id)) {
        tagToPosts.set(tagNode.id, []);
      }
      tagToPosts.get(tagNode.id).push(postNode);
      addAdjacency(postNode.id, tagNode.id);
      addAdjacency(tagNode.id, postNode.id);
    });
  });

  stats.textContent = `${posts.length} posts · ${tagMap.size} tags · ${links.length} links`;

  const nodeElements = new Map();
  const linkElements = [];

  function createLine() {
    return document.createElementNS('http://www.w3.org/2000/svg', 'line');
  }

  links.forEach((link) => {
    const line = createLine();
    line.classList.add('blog-viewer__edge');
    edges.appendChild(line);
    linkElements.push({ link, element: line });
  });

  const tagNodes = nodes.filter((node) => node.type === 'tag');
  const minTagDegree = tagNodes.reduce((min, node) => Math.min(min, node.degree), Infinity);
  const maxTagDegree = tagNodes.reduce((max, node) => Math.max(max, node.degree), 0);
  const logMin = Math.log((Number.isFinite(minTagDegree) ? minTagDegree : 0) + 1 || 1);
  const logMax = Math.log((Number.isFinite(maxTagDegree) ? maxTagDegree : 0) + 1 || 1);
  const scaleMin = 0.88;
  const scaleMax = 1.18;

  nodes.forEach((node, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `blog-node blog-node--${node.type}`;
    button.textContent = node.type === 'tag' ? `#${node.label}` : node.label;
    button.style.animationDelay = `${index * 30}ms`;
    const scale =
      node.type === 'tag' && maxTagDegree > 0
        ? scaleMin +
          (scaleMax - scaleMin) *
            ((Math.log(node.degree + 1) - logMin) / (logMax - logMin || 1))
        : 1;
    button.style.setProperty('--node-scale', scale.toFixed(3));
    button.style.setProperty('--node-scale-hover', (scale * 1.05).toFixed(3));
    button.style.setProperty('--node-scale-active', (scale * 1.08).toFixed(3));
    button.setAttribute('data-node-id', node.id);
    button.setAttribute(
      'aria-label',
      node.type === 'tag' ? `tag ${node.label}` : `post ${node.label}`
    );
    nodesLayer.appendChild(button);
    node.el = button;
    nodeElements.set(node.id, node);
  });

  let activeNodeId = nodes[0] ? nodes[0].id : null;
  let hoverNodeId = null;
  let width = 0;
  let height = 0;
  let centerX = 0;
  let centerY = 0;
  let ringRadius = 0;
  let frameId = null;
  let running = false;
  let graphRect = null;
  let dragState = null;

  const config = {
    charge: 1200,
    linkDistance: 140,
    linkStrength: 0.015,
    centerStrength: 0.01,
    ringStrength: 0.006,
    friction: 0.86,
    maxVelocity: 4,
    padding: 26,
  };

  function updateBounds() {
    graphRect = graph.getBoundingClientRect();
    width = graphRect.width;
    height = graphRect.height;
    centerX = width / 2;
    centerY = height / 2;
    ringRadius = Math.min(width, height) * 0.36;
    edges.setAttribute('width', `${width}`);
    edges.setAttribute('height', `${height}`);
    edges.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function initializePositions() {
    updateBounds();
    const tagNodes = nodes.filter((node) => node.type === 'tag');
    const postNodes = nodes.filter((node) => node.type === 'post');
    const tagCount = Math.max(1, tagNodes.length);

    tagNodes.forEach((node, index) => {
      const angle = (index / tagCount) * Math.PI * 2;
      node.x = centerX + Math.cos(angle) * ringRadius;
      node.y = centerY + Math.sin(angle) * ringRadius;
      node.vx = 0;
      node.vy = 0;
    });

    postNodes.forEach((node) => {
      node.x = centerX + (Math.random() - 0.5) * ringRadius * 0.4;
      node.y = centerY + (Math.random() - 0.5) * ringRadius * 0.4;
      node.vx = 0;
      node.vy = 0;
    });
  }

  function updateNodePositions() {
    nodes.forEach((node) => {
      if (!node.el) return;
      node.el.style.left = `${node.x}px`;
      node.el.style.top = `${node.y}px`;
    });
  }

  function updateLinkPositions() {
    linkElements.forEach(({ link, element }) => {
      element.setAttribute('x1', link.source.x.toFixed(2));
      element.setAttribute('y1', link.source.y.toFixed(2));
      element.setAttribute('x2', link.target.x.toFixed(2));
      element.setAttribute('y2', link.target.y.toFixed(2));
    });
  }

  function applyForces() {
    const nodeCount = nodes.length;
    for (let i = 0; i < nodeCount; i += 1) {
      const nodeA = nodes[i];
      for (let j = i + 1; j < nodeCount; j += 1) {
        const nodeB = nodes[j];
        const dx = nodeB.x - nodeA.x;
        const dy = nodeB.y - nodeA.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        if (distance > 280) continue;
        const force = config.charge / (distance * distance);
        const fx = (dx / distance) * force;
        const fy = (dy / distance) * force;
        nodeA.vx -= fx;
        nodeA.vy -= fy;
        nodeB.vx += fx;
        nodeB.vy += fy;
      }
    }

    links.forEach((link) => {
      const dx = link.target.x - link.source.x;
      const dy = link.target.y - link.source.y;
      const distance = Math.sqrt(dx * dx + dy * dy) || 1;
      const targetDistance = config.linkDistance;
      const force = (distance - targetDistance) * config.linkStrength * link.strength;
      const fx = (dx / distance) * force;
      const fy = (dy / distance) * force;
      link.source.vx += fx;
      link.source.vy += fy;
      link.target.vx -= fx;
      link.target.vy -= fy;
    });

    nodes.forEach((node) => {
      const dx = centerX - node.x;
      const dy = centerY - node.y;
      const centerForce = config.centerStrength * (node.type === 'post' ? 1.4 : 0.6);
      node.vx += dx * centerForce * 0.01;
      node.vy += dy * centerForce * 0.01;

      if (node.type === 'tag') {
        const rdx = node.x - centerX;
        const rdy = node.y - centerY;
        const radius = Math.sqrt(rdx * rdx + rdy * rdy) || 1;
        const radialOffset = radius - ringRadius;
        const radialForce = radialOffset * config.ringStrength * 0.01;
        node.vx -= (rdx / radius) * radialForce;
        node.vy -= (rdy / radius) * radialForce;
      }
    });
  }

  function step() {
    if (!running) {
      frameId = null;
      return;
    }

    applyForces();

    nodes.forEach((node) => {
      if (node.dragging) {
        node.vx = 0;
        node.vy = 0;
        return;
      }
      node.vx *= config.friction;
      node.vy *= config.friction;
      node.vx = clamp(node.vx, -config.maxVelocity, config.maxVelocity);
      node.vy = clamp(node.vy, -config.maxVelocity, config.maxVelocity);
      node.x += node.vx;
      node.y += node.vy;
      node.x = clamp(node.x, config.padding, width - config.padding);
      node.y = clamp(node.y, config.padding, height - config.padding);
    });

    updateNodePositions();
    updateLinkPositions();

    frameId = requestAnimationFrame(step);
  }

  function start() {
    if (running) return;
    running = true;
    if (!frameId) {
      frameId = requestAnimationFrame(step);
    }
  }

  function stop() {
    running = false;
    if (frameId) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  function setActive(nodeId) {
    if (!nodeId) return;
    activeNodeId = nodeId;
    const node = nodeElements.get(nodeId);
    if (!node) return;

    detailsTitle.textContent = node.type === 'tag' ? `#${node.label}` : node.label;
    detailsMeta.textContent =
      node.type === 'post'
        ? `${node.date || 'undated'} · ${node.tags.length} tags`
        : `${node.degree} posts tagged`;
    if (node.type === 'post') {
      detailsBody.textContent = node.preview || node.excerpt || 'no excerpt available.';
      detailsTagsLabel.textContent = 'tags';
      detailsRelatedLabel.textContent = 'related posts';
      detailsRelatedLabel.style.display = 'block';
      detailsRelatedList.style.display = 'flex';
      detailsTagsList.textContent = '';
      detailsRelatedList.textContent = '';
      node.tags.forEach((tag) => {
        const chip = document.createElement('span');
        chip.className = 'blog-viewer__chip';
        chip.textContent = `#${tag}`;
        detailsTagsList.appendChild(chip);
      });

      const relatedMap = new Map();
      const tagIds = adjacency.get(node.id) ? Array.from(adjacency.get(node.id)) : [];
      tagIds.forEach((tagId) => {
        const relatedPosts = tagToPosts.get(tagId) || [];
        relatedPosts.forEach((post) => {
          if (post.id === node.id) return;
          relatedMap.set(post.id, (relatedMap.get(post.id) || 0) + 1);
        });
      });

      const relatedEntries = Array.from(relatedMap.entries())
        .map(([id, score]) => ({ node: nodeElements.get(id), score }))
        .filter((entry) => entry.node && entry.node.type === 'post')
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);

      if (relatedEntries.length === 0) {
        const empty = document.createElement('span');
        empty.className = 'blog-viewer__chip blog-viewer__chip--post';
        empty.textContent = 'no related posts yet';
        detailsRelatedList.appendChild(empty);
      } else {
        relatedEntries.forEach(({ node: relatedNode }) => {
          const chip = document.createElement('span');
          chip.className = 'blog-viewer__chip blog-viewer__chip--post';
          chip.textContent = relatedNode.label;
          detailsRelatedList.appendChild(chip);
        });
      });
      detailsLink.style.display = 'inline-flex';
      detailsLink.setAttribute('href', node.url);
    } else {
      detailsBody.textContent = 'posts connected to this tag';
      detailsTagsLabel.textContent = 'posts';
      detailsRelatedLabel.style.display = 'none';
      detailsRelatedList.style.display = 'none';
      detailsTagsList.textContent = '';
      detailsRelatedList.textContent = '';
      const relatedPosts = nodes.filter(
        (candidate) => candidate.type === 'post' && adjacency.get(node.id)?.has(candidate.id)
      );
      relatedPosts.slice(0, 6).forEach((post) => {
        const chip = document.createElement('span');
        chip.className = 'blog-viewer__chip blog-viewer__chip--post';
        chip.textContent = post.label;
        detailsTagsList.appendChild(chip);
      });
      detailsLink.style.display = 'none';
      detailsLink.removeAttribute('href');
    }

    updateHighlights();
  }

  function updateHighlights() {
    const focusSet = new Set();
    if (activeNodeId && adjacency.has(activeNodeId)) {
      adjacency.get(activeNodeId).forEach((id) => focusSet.add(id));
    }
    if (activeNodeId) focusSet.add(activeNodeId);

    nodes.forEach((node) => {
      if (!node.el) return;
      const isActive = node.id === activeNodeId;
      const isHover = hoverNodeId && (node.id === hoverNodeId || adjacency.get(hoverNodeId)?.has(node.id));
      const isFocused = activeNodeId ? focusSet.has(node.id) : true;
      node.el.classList.toggle('is-active', isActive);
      node.el.classList.toggle('is-hovered', !!hoverNodeId && isHover);
      node.el.classList.toggle('is-muted', activeNodeId && !isFocused);
    });

    linkElements.forEach(({ link, element }) => {
      const isActive =
        activeNodeId &&
        (link.source.id === activeNodeId ||
          link.target.id === activeNodeId ||
          (focusSet.has(link.source.id) && focusSet.has(link.target.id)));
      const isHover =
        hoverNodeId &&
        (link.source.id === hoverNodeId || link.target.id === hoverNodeId);
      element.classList.toggle('is-active', !!isActive);
      element.classList.toggle('is-hovered', !!hoverNodeId && isHover);
    });
  }

  function handlePointerDown(event, node) {
    event.preventDefault();
    updateBounds();
    node.dragging = true;
    dragState = { node, pointerId: event.pointerId };
    node.el.setPointerCapture(event.pointerId);
    const x = event.clientX - graphRect.left;
    const y = event.clientY - graphRect.top;
    node.x = clamp(x, config.padding, width - config.padding);
    node.y = clamp(y, config.padding, height - config.padding);
    updateNodePositions();
    updateLinkPositions();
  }

  function handlePointerMove(event) {
    if (!dragState) return;
    if (event.pointerId !== dragState.pointerId) return;
    const { node } = dragState;
    const x = event.clientX - graphRect.left;
    const y = event.clientY - graphRect.top;
    node.x = clamp(x, config.padding, width - config.padding);
    node.y = clamp(y, config.padding, height - config.padding);
    updateNodePositions();
    updateLinkPositions();
  }

  function endDrag(event) {
    if (!dragState) return;
    if (event.pointerId !== dragState.pointerId) return;
    dragState.node.dragging = false;
    if (dragState.node.el.hasPointerCapture(dragState.pointerId)) {
      dragState.node.el.releasePointerCapture(dragState.pointerId);
    }
    dragState = null;
  }

  nodes.forEach((node) => {
    if (!node.el) return;
    manageEvent(node.el, 'click', () => setActive(node.id));
    manageEvent(node.el, 'pointerdown', (event) => handlePointerDown(event, node));
    manageEvent(node.el, 'pointerenter', () => {
      hoverNodeId = node.id;
      updateHighlights();
    });
    manageEvent(node.el, 'pointerleave', () => {
      hoverNodeId = null;
      updateHighlights();
    });
  });

  manageEvent(window, 'pointermove', handlePointerMove);
  manageEvent(window, 'pointerup', endDrag);
  manageEvent(window, 'pointercancel', endDrag);
  manageEvent(window, 'resize', () => {
    initializePositions();
    updateNodePositions();
    updateLinkPositions();
  });

  initializePositions();
  updateNodePositions();
  updateLinkPositions();
  setActive(activeNodeId);

  if (controller) {
    controller.onChange((active) => {
      if (active) {
        start();
      } else {
        stop();
      }
    });
  } else {
    start();
  }
})();
