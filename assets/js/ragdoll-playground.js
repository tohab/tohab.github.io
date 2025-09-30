(() => {
  const canvas = document.getElementById('ragdoll-simulator');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const hues = [330, 25, 55, 200, 260, 120, 185, 300];
  const defaultGravity = { x: 0, y: 2200 };
  const damping = 0.985;
  const iterations = 6;
  const bounce = 0.6;
  const pullStrength = 2000;
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  let backgroundGradient = null;

  const pointer = { x: 0, y: 0, active: false, dragging: null, pointerId: null };

  let points = [];
  let sticks = [];

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    backgroundGradient = ctx.createLinearGradient(0, 0, width, height);
    backgroundGradient.addColorStop(0, '#161a42');
    backgroundGradient.addColorStop(1, '#22092f');
    if (!points.length) {
      initRagdoll();
    }
  }

  function createPoint(x, y, radius, mass = 1, hueIndex = 0) {
    return {
      x,
      y,
      prevX: x,
      prevY: y,
      radius,
      mass,
      hue: hues[hueIndex % hues.length],
    };
  }

  function createStick(a, b, stiffness = 1, hueIndex = 0) {
    const p1 = points[a];
    const p2 = points[b];
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const length = Math.hypot(dx, dy);
    return {
      a,
      b,
      length,
      stiffness,
      hue: hues[hueIndex % hues.length],
    };
  }

  function initRagdoll() {
    const cx = width / 2;
    const cy = height / 2 - 40;
    points = [];
    const addPoint = (x, y, radius, mass = 1) => {
      points.push(createPoint(x, y, radius, mass, points.length));
    };

    addPoint(cx, cy - 140, 22); // head
    addPoint(cx, cy - 100, 16); // neck
    addPoint(cx, cy - 60, 18); // chest
    addPoint(cx, cy - 10, 18); // stomach
    addPoint(cx - 45, cy - 65, 15); // left shoulder
    addPoint(cx - 90, cy - 25, 14); // left elbow
    addPoint(cx - 120, cy + 40, 15); // left hand
    addPoint(cx + 45, cy - 65, 15); // right shoulder
    addPoint(cx + 90, cy - 25, 14); // right elbow
    addPoint(cx + 120, cy + 40, 15); // right hand
    addPoint(cx - 28, cy + 45, 16); // left hip
    addPoint(cx - 38, cy + 105, 16); // left knee
    addPoint(cx - 38, cy + 165, 18); // left foot
    addPoint(cx + 28, cy + 45, 16); // right hip
    addPoint(cx + 38, cy + 105, 16); // right knee
    addPoint(cx + 38, cy + 165, 18); // right foot

    sticks = [];
    const addStick = (a, b, stiffness = 1) => {
      sticks.push(createStick(a, b, stiffness, sticks.length));
    };

    addStick(0, 1);
    addStick(1, 2);
    addStick(2, 3);
    addStick(2, 4);
    addStick(4, 5);
    addStick(5, 6);
    addStick(2, 7);
    addStick(7, 8);
    addStick(8, 9);
    addStick(3, 10);
    addStick(10, 11);
    addStick(11, 12);
    addStick(3, 13);
    addStick(13, 14);
    addStick(14, 15);
    addStick(4, 7, 0.8);
    addStick(10, 13, 0.8);
    addStick(1, 4, 0.85);
    addStick(1, 7, 0.85);
    addStick(0, 4, 0.75);
    addStick(0, 7, 0.75);
    addStick(2, 10, 0.75);
    addStick(2, 13, 0.75);
    addStick(4, 10, 0.6);
    addStick(7, 13, 0.6);
    addStick(5, 8, 0.6);
    addStick(6, 9, 0.5);
    addStick(11, 14, 0.5);
    addStick(12, 15, 0.5);
  }

  function getPointerPosition(event) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function findClosestPoint({ x, y }) {
    let nearest = null;
    let minDist = Infinity;
    for (const point of points) {
      const dx = point.x - x;
      const dy = point.y - y;
      const dist = Math.hypot(dx, dy);
      if (dist < minDist) {
        minDist = dist;
        nearest = point;
      }
    }
    return minDist < (nearest ? nearest.radius * 2.2 : Infinity) ? nearest : null;
  }

  function updatePointer(event) {
    const pos = getPointerPosition(event);
    pointer.x = pos.x;
    pointer.y = pos.y;
    if (pointer.dragging) {
      pointer.dragging.x = pointer.x;
      pointer.dragging.y = pointer.y;
      pointer.dragging.prevX = pointer.x;
      pointer.dragging.prevY = pointer.y;
    }
  }

  canvas.addEventListener('pointerdown', (event) => {
    canvas.setPointerCapture(event.pointerId);
    pointer.pointerId = event.pointerId;
    pointer.active = true;
    updatePointer(event);
    pointer.dragging = findClosestPoint(pointer);
  });

  canvas.addEventListener('pointermove', (event) => {
    if (!pointer.active) return;
    updatePointer(event);
  });

  canvas.addEventListener('pointerup', (event) => {
    if (pointer.pointerId === event.pointerId) {
      if (canvas.hasPointerCapture(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
      pointer.active = false;
      pointer.dragging = null;
      pointer.pointerId = null;
    }
  });

  canvas.addEventListener('pointercancel', (event) => {
    if (pointer.pointerId === event.pointerId && canvas.hasPointerCapture(event.pointerId)) {
      canvas.releasePointerCapture(event.pointerId);
    }
    pointer.active = false;
    pointer.dragging = null;
    pointer.pointerId = null;
  });

  function integrate(point, dt) {
    if (pointer.dragging === point) return;

    const vx = (point.x - point.prevX) * damping;
    const vy = (point.y - point.prevY) * damping;

    let ax = defaultGravity.x;
    let ay = defaultGravity.y;

    if (pointer.active && !pointer.dragging) {
      const dx = pointer.x - point.x;
      const dy = pointer.y - point.y;
      const dist = Math.hypot(dx, dy) || 1;
      const falloff = Math.min(1, 180 / dist);
      ax += (dx / dist) * pullStrength * falloff;
      ay += (dy / dist) * pullStrength * falloff;
    }

    const nextX = point.x + vx + (ax / point.mass) * dt * dt;
    const nextY = point.y + vy + (ay / point.mass) * dt * dt;

    point.prevX = point.x;
    point.prevY = point.y;
    point.x = nextX;
    point.y = nextY;

    constrainToBounds(point, vx, vy);
  }

  function constrainToBounds(point, vx, vy) {
    const r = point.radius;
    if (point.x < r) {
      point.x = r;
      point.prevX = point.x + vx * bounce;
    } else if (point.x > width - r) {
      point.x = width - r;
      point.prevX = point.x + vx * bounce;
    }
    if (point.y < r) {
      point.y = r;
      point.prevY = point.y + vy * bounce;
    } else if (point.y > height - r) {
      point.y = height - r;
      point.prevY = point.y + vy * bounce;
    }
  }

  function satisfyConstraints() {
    for (let i = 0; i < iterations; i += 1) {
      for (const stick of sticks) {
        const p1 = points[stick.a];
        const p2 = points[stick.b];
        if (p1 === pointer.dragging && p2 === pointer.dragging) continue;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dist = Math.hypot(dx, dy) || 0.0001;
        const diff = (dist - stick.length) / dist;
        const adjust = 0.5 * stick.stiffness;
        const offsetX = dx * diff * adjust;
        const offsetY = dy * diff * adjust;

        if (p1 !== pointer.dragging) {
          p1.x += offsetX;
          p1.y += offsetY;
        }
        if (p2 !== pointer.dragging) {
          p2.x -= offsetX;
          p2.y -= offsetY;
        }
      }
    }
  }

  function draw(time) {
    ctx.fillStyle = backgroundGradient || '#12011c';
    ctx.fillRect(0, 0, width, height);

    const hueShift = (time * 0.04) % 360;

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const stick of sticks) {
      const p1 = points[stick.a];
      const p2 = points[stick.b];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineWidth = (p1.radius + p2.radius) * 0.25;
      ctx.strokeStyle = `hsl(${(stick.hue + hueShift) % 360}, 90%, 55%)`;
      ctx.shadowBlur = 8;
      ctx.shadowColor = `hsla(${(stick.hue + hueShift) % 360}, 90%, 55%, 0.6)`;
      ctx.stroke();
    }

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    for (const point of points) {
      ctx.beginPath();
      ctx.arc(point.x, point.y, point.radius * 0.9, 0, Math.PI * 2);
      const hue = (point.hue + hueShift) % 360;
      ctx.fillStyle = `hsl(${hue}, 100%, ${pointer.dragging === point ? 65 : 55}%)`;
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = `hsl(${hue}, 90%, 45%)`;
      ctx.stroke();
    }

    if (pointer.active && !pointer.dragging) {
      const gradient = ctx.createRadialGradient(pointer.x, pointer.y, 0, pointer.x, pointer.y, 120);
      gradient.addColorStop(0, 'hsla(40, 100%, 70%, 0.35)');
      gradient.addColorStop(1, 'hsla(200, 100%, 60%, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(pointer.x, pointer.y, 120, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  let lastTime = performance.now();
  function frame(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.035);
    lastTime = now;

    for (const point of points) {
      integrate(point, dt);
    }
    satisfyConstraints();
    draw(now);
    requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  requestAnimationFrame(frame);
})();
