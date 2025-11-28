---
layout: null
title: looping life garden
summary: >-
  watch conway's game of life bloom on an endless torus. click or drag to seed
  new cells and nudge the color-shifting ecosystem.
element_tag: canvas
element_id: conway-life
element_class: embed-responsive-item
element_role: img
element_aria_label: "Conway's Game of Life simulation"
aspect_ratio: embed-responsive-4by3
order: 3
---

(() => {
  const canvas = document.getElementById('conway-life');
  if (!canvas) return;

  const controller =
    window.createGamePanelController && typeof window.createGamePanelController === 'function'
      ? window.createGamePanelController(canvas)
      : null;

  const manageEvent = controller
    ? (target, type, handler, options) => controller.addManagedEvent(target, type, handler, options)
    : (target, type, handler, options) => {
        target.addEventListener(type, handler, options);
        return () => target.removeEventListener(type, handler, options);
      };

  const ctx = canvas.getContext('2d');
  const GRID_SIZE = 60;
  const STEP_MS = 140;
  const INITIAL_DENSITY = 0.18;

  const cellCount = GRID_SIZE * GRID_SIZE;
  const grid = new Uint8Array(cellCount);
  const nextGrid = new Uint8Array(cellCount);
  const ageGrid = new Uint16Array(cellCount);
  const nextAgeGrid = new Uint16Array(cellCount);

  let dpr = window.devicePixelRatio || 1;
  let width = 0;
  let height = 0;
  let cellSize = 0;
  let offsetX = 0;
  let offsetY = 0;

  let lastTick = performance.now();
  let hueOrbit = Math.random() * 360;
  let pointerActive = false;
  let pointerId = null;
  let frameHandle = null;
  let running = false;

  seedRandomPattern();
  manageEvent(window, 'resize', resizeCanvas);

  manageEvent(canvas, 'pointerdown', (event) => {
    event.preventDefault();
    pointerActive = true;
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    spawnFromEvent(event);
  });

  manageEvent(canvas, 'pointermove', (event) => {
    if (!pointerActive) return;
    spawnFromEvent(event);
  });

  manageEvent(canvas, 'pointerup', (event) => {
    if (pointerId !== event.pointerId) return;
    pointerActive = false;
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    pointerId = null;
  });

  manageEvent(canvas, 'pointercancel', (event) => {
    if (pointerId !== event.pointerId) return;
    pointerActive = false;
    if (canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    pointerId = null;
  });

  function loop(now) {
    if (!running) {
      frameHandle = null;
      return;
    }
    const delta = now - lastTick;
    if (delta >= STEP_MS) {
      advanceGeneration();
      lastTick = now;
      hueOrbit = (hueOrbit + delta * 0.02) % 360;
    }
    render(now);
    frameHandle = requestAnimationFrame(loop);
  }

  function seedRandomPattern() {
    for (let i = 0; i < cellCount; i += 1) {
      if (Math.random() < INITIAL_DENSITY) {
        grid[i] = 1;
        ageGrid[i] = 1 + Math.floor(Math.random() * 4);
      }
    }
  }

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cellSize = Math.max(1, Math.floor(Math.min(width, height) / GRID_SIZE));
    const renderSize = cellSize * GRID_SIZE;
    offsetX = (width - renderSize) / 2;
    offsetY = (height - renderSize) / 2;
  }

  function getIndex(x, y) {
    const wrappedX = (x + GRID_SIZE) % GRID_SIZE;
    const wrappedY = (y + GRID_SIZE) % GRID_SIZE;
    return wrappedY * GRID_SIZE + wrappedX;
  }

  function advanceGeneration() {
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const idx = y * GRID_SIZE + x;
        const alive = grid[idx];
        let neighbors = 0;

        neighbors += grid[getIndex(x - 1, y - 1)];
        neighbors += grid[getIndex(x, y - 1)];
        neighbors += grid[getIndex(x + 1, y - 1)];
        neighbors += grid[getIndex(x - 1, y)];
        neighbors += grid[getIndex(x + 1, y)];
        neighbors += grid[getIndex(x - 1, y + 1)];
        neighbors += grid[getIndex(x, y + 1)];
        neighbors += grid[getIndex(x + 1, y + 1)];

        let nextAlive = alive;
        if (alive) {
          nextAlive = neighbors === 2 || neighbors === 3 ? 1 : 0;
        } else if (neighbors === 3) {
          nextAlive = 1;
        } else {
          nextAlive = 0;
        }

        nextGrid[idx] = nextAlive;
        nextAgeGrid[idx] = nextAlive ? (alive ? ageGrid[idx] + 1 : 1) : 0;
      }
    }

    grid.set(nextGrid);
    ageGrid.set(nextAgeGrid);
  }

  function render(now) {
    ctx.clearRect(0, 0, width, height);

    const backgroundHue = (hueOrbit + now * 0.01) % 360;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, `hsl(${backgroundHue}, 40%, 8%)`);
    gradient.addColorStop(1, `hsl(${(backgroundHue + 60) % 360}, 50%, 12%)`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const margin = Math.max(0.2, cellSize * 0.15);
    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        const idx = y * GRID_SIZE + x;
        const alive = grid[idx];
        if (!alive) continue;

        const age = ageGrid[idx];
        const hue = (hueOrbit + age * 4 + (x * 3 + y * 5)) % 360;
        const sat = 65 + 20 * Math.sin((age + now * 0.004) * 0.35);
        const light = 45 + 20 * Math.sin((age + x + now * 0.003) * 0.2);
        ctx.fillStyle = `hsl(${hue}, ${Math.round(sat)}%, ${Math.round(light)}%)`;

        const drawX = offsetX + x * cellSize + margin;
        const drawY = offsetY + y * cellSize + margin;
        const size = cellSize - margin * 2;
        if (size <= 0) {
          ctx.fillRect(drawX, drawY, cellSize, cellSize);
        } else {
          ctx.fillRect(drawX, drawY, size, size);
        }
      }
    }

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    const gridExtent = cellSize * GRID_SIZE;
    ctx.save();
    ctx.translate(offsetX, offsetY);
    ctx.beginPath();
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const pos = Math.round(i * cellSize) + 0.5;
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, gridExtent);
      ctx.moveTo(0, pos);
      ctx.lineTo(gridExtent, pos);
    }
    ctx.stroke();
    ctx.restore();
  }

  function spawnFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) - offsetX) / cellSize;
    const y = ((event.clientY - rect.top) - offsetY) / cellSize;
    const cellX = Math.floor(x);
    const cellY = Math.floor(y);
    if (Number.isNaN(cellX) || Number.isNaN(cellY)) return;
    if (cellX < 0 || cellX >= GRID_SIZE || cellY < 0 || cellY >= GRID_SIZE) return;

    const idx = cellY * GRID_SIZE + cellX;
    grid[idx] = 1;
    ageGrid[idx] = 1;
  }

  function startSimulation() {
    if (running) return;
    running = true;
    resizeCanvas();
    lastTick = performance.now();
    frameHandle = requestAnimationFrame(loop);
  }

  function stopSimulation() {
    running = false;
    pointerActive = false;
    pointerId = null;
    if (frameHandle !== null) {
      cancelAnimationFrame(frameHandle);
      frameHandle = null;
    }
  }

  if (controller) {
    controller.onChange((active) => {
      if (active) {
        startSimulation();
      } else {
        stopSimulation();
      }
    });
  } else {
    startSimulation();
  }
})();
