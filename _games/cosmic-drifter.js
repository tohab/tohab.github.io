---
layout: null
title: cosmic drift courier
summary: >-
  pilot a nimble courier ship through an endless 3d star lane. weave between
  asteroids, skim drifting planets, and boost through shimmering dust clouds.
element_tag: canvas
element_id: cosmic-drifter
element_class: embed-responsive-item
element_role: img
element_aria_label: 3d starfield exploration game
aspect_ratio: embed-responsive-21by9
order: 6
---

(() => {
  const canvas = document.getElementById('cosmic-drifter');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;

  const SPACE_CONFIG = {
    fieldWidth: 140,
    fieldHeight: 90,
    far: 950,
    minDepth: 4,
    spawnSpread: 400,
    stars: 260,
    asteroids: 45,
    planets: 8,
  };

  const ship = {
    x: 0,
    y: 0,
    z: 0,
    vx: 0,
    vy: 0,
    roll: 0,
    pitch: 0,
    yaw: 0,
    accel: 45,
    drag: 6,
    speed: 40,
    baseSpeed: 40,
    boostSpeed: 70,
    brakeSpeed: 15,
  };

  const camera = {
    fov: 680,
    shake: 0,
    shakeTime: 0,
  };

  const input = {
    up: false,
    down: false,
    left: false,
    right: false,
    boost: false,
    brake: false,
  };

  const keyMap = new Map([
    ['ArrowUp', 'up'],
    ['KeyW', 'up'],
    ['ArrowDown', 'down'],
    ['KeyS', 'down'],
    ['ArrowLeft', 'left'],
    ['KeyA', 'left'],
    ['ArrowRight', 'right'],
    ['KeyD', 'right'],
    ['ShiftLeft', 'boost'],
    ['ShiftRight', 'boost'],
    ['Space', 'brake'],
  ]);

  const spaceObjects = [];
  let lastTime = performance.now();

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = window.devicePixelRatio || 1;
    width = rect.width;
    height = rect.height;
    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawnObject(type, depthOffset = 0) {
    const { fieldWidth, fieldHeight, far, spawnSpread } = SPACE_CONFIG;
    const x = (Math.random() * 2 - 1) * fieldWidth;
    const y = (Math.random() * 2 - 1) * fieldHeight;
    const z = far + Math.random() * spawnSpread + depthOffset;
    const base = {
      type,
      x,
      y,
      z,
      spin: Math.random() * Math.PI * 2,
    };
    if (type === 'star') {
      base.radius = Math.random() * 0.6 + 0.15;
      base.speed = 0;
      base.alpha = Math.random() * 0.4 + 0.3;
    } else if (type === 'asteroid') {
      base.radius = Math.random() * 3 + 1.5;
      base.speed = Math.random() * 6;
      base.jitter = (Math.random() * 0.4 + 0.15) * (Math.random() > 0.5 ? 1 : -1);
      base.tones = [
        `#${Math.floor(80 + Math.random() * 60).toString(16)}${Math.floor(60 + Math.random() * 60)
          .toString(16)
          .padStart(2, '0')}52`,
        '#302726',
      ];
    } else {
      base.radius = Math.random() * 8 + 5;
      base.speed = Math.random() * 4;
      base.tilt = Math.random() * 0.6 - 0.3;
      base.bandColor = `hsl(${Math.floor(Math.random() * 360)},60%,60%)`;
      base.glow = `hsla(${Math.floor(Math.random() * 360)},80%,60%,0.35)`;
    }
    spaceObjects.push(base);
  }

  function resetObject(obj, depthOffset = 0) {
    const { fieldWidth, fieldHeight, far, spawnSpread } = SPACE_CONFIG;
    obj.x = (Math.random() * 2 - 1) * fieldWidth;
    obj.y = (Math.random() * 2 - 1) * fieldHeight;
    obj.z = far + Math.random() * spawnSpread + depthOffset;
  }

  function initField() {
    for (let i = 0; i < SPACE_CONFIG.stars; i += 1) {
      spawnObject('star', i);
    }
    for (let i = 0; i < SPACE_CONFIG.asteroids; i += 1) {
      spawnObject('asteroid', i * 4);
    }
    for (let i = 0; i < SPACE_CONFIG.planets; i += 1) {
      spawnObject('planet', i * 60);
    }
  }

  function handleKey(e, state) {
    const key = keyMap.get(e.code);
    if (!key) return;
    input[key] = state;
    e.preventDefault();
  }

  function attachEvents() {
    window.addEventListener('keydown', (e) => handleKey(e, true));
    window.addEventListener('keyup', (e) => handleKey(e, false));
    window.addEventListener('resize', resize);
  }

  function updateShip(dt) {
    const horizontal = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const vertical = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    const desiredSpeed = input.boost
      ? ship.boostSpeed
      : input.brake
      ? ship.brakeSpeed
      : ship.baseSpeed;
    ship.speed += (desiredSpeed - ship.speed) * Math.min(1, dt * 2.5);

    ship.vx += horizontal * ship.accel * dt;
    ship.vy += vertical * ship.accel * dt;
    ship.vx -= ship.vx * ship.drag * dt;
    ship.vy -= ship.vy * ship.drag * dt;

    ship.x += ship.vx * dt;
    ship.y += ship.vy * dt;

    const targetRoll = ship.vx * -0.03 + horizontal * -0.5;
    const targetPitch = ship.vy * 0.02 + vertical * 0.6;
    ship.roll += (targetRoll - ship.roll) * Math.min(1, dt * 6);
    ship.pitch += (targetPitch - ship.pitch) * Math.min(1, dt * 6);
    ship.yaw = ship.roll * 0.5;
  }

  function updateObjects(dt) {
    const minDepth = SPACE_CONFIG.minDepth;
    for (const obj of spaceObjects) {
      obj.z -= (ship.speed + obj.speed) * dt;
      obj.x -= ship.vx * dt * 0.35;
      obj.y -= ship.vy * dt * 0.35;
      if (obj.type !== 'star') {
        obj.spin += dt * 0.4;
      }
      if (obj.type === 'asteroid') {
        obj.x += Math.sin(obj.spin) * obj.jitter * dt;
      } else if (obj.type === 'planet') {
        obj.spin += dt * obj.tilt;
      }
      if (obj.z < minDepth) {
        resetObject(obj);
      }
    }
  }

  function project(dx, dy, dz) {
    const scale = camera.fov / dz;
    return {
      x: width * 0.5 + dx * scale,
      y: height * 0.5 + dy * scale,
      scale,
    };
  }

  function drawBackground() {
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#030613');
    gradient.addColorStop(1, '#090f24');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    const horizonY = height * 0.65;
    ctx.ellipse(width / 2, horizonY, width, height * 0.7, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#0d1837';
    ctx.fill();
    ctx.restore();
  }

  function drawObjects() {
    const sorted = [...spaceObjects].sort((a, b) => b.z - a.z);
    for (const obj of sorted) {
      const dx = obj.x - ship.x;
      const dy = obj.y - ship.y;
      const dz = obj.z - ship.z;
      if (dz <= SPACE_CONFIG.minDepth) continue;
      const { x, y, scale } = project(dx, dy, dz);
      if (x < -100 || x > width + 100 || y < -100 || y > height + 100) continue;

      if (obj.type === 'star') {
        ctx.globalAlpha = obj.alpha;
        ctx.fillStyle = '#dfe7ff';
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.6, obj.radius * scale), 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      } else if (obj.type === 'asteroid') {
        const radius = obj.radius * scale;
        if (radius < 0.5) continue;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(obj.spin);
        const gradient = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius);
        gradient.addColorStop(0, obj.tones[0]);
        gradient.addColorStop(1, obj.tones[1]);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 1.2, radius, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      } else {
        const radius = obj.radius * scale;
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(obj.spin);
        ctx.beginPath();
        ctx.fillStyle = obj.bandColor;
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.25)';
        ctx.lineWidth = radius * 0.15;
        ctx.beginPath();
        ctx.ellipse(0, 0, radius * 0.7, radius * 0.35, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        ctx.save();
        ctx.globalAlpha = 0.35;
        ctx.fillStyle = obj.glow;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }
  }

  function drawShip() {
    ctx.save();
    ctx.translate(width / 2, height / 2 + height * 0.1);
    ctx.rotate(ship.roll * 0.04);

    ctx.save();
    ctx.rotate(ship.roll * 0.01);
    ctx.fillStyle = '#071f30';
    ctx.beginPath();
    ctx.moveTo(-80, -12);
    ctx.lineTo(80, -12);
    ctx.lineTo(80, 12);
    ctx.lineTo(-80, 12);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.rotate(ship.roll * 0.25);
    ctx.scale(1 + ship.pitch * 0.06, 1 - ship.pitch * 0.06);
    ctx.beginPath();
    ctx.moveTo(0, -28);
    ctx.lineTo(40, 35);
    ctx.lineTo(0, 18);
    ctx.lineTo(-40, 35);
    ctx.closePath();
    ctx.fillStyle = '#7be0ff';
    ctx.strokeStyle = '#0b6e99';
    ctx.lineWidth = 4;
    ctx.shadowColor = '#4af0ff';
    ctx.shadowBlur = 25;
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    ctx.shadowBlur = 0;
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffb347';
    ctx.globalAlpha = input.boost ? 0.85 : 0.45;
    ctx.beginPath();
    ctx.moveTo(-18, 35);
    ctx.lineTo(0, 70 + ship.pitch * 6);
    ctx.lineTo(18, 35);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  function drawHud(dt) {
    const padding = 18;
    ctx.fillStyle = 'rgba(8,12,28,0.65)';
    ctx.fillRect(padding, padding, 230, 100);
    ctx.strokeStyle = 'rgba(120,186,255,0.4)';
    ctx.strokeRect(padding, padding, 230, 100);

    ctx.fillStyle = '#9bd5ff';
    ctx.font = '16px "Space Mono", Consolas, monospace';
    ctx.textBaseline = 'top';
    const speedLabel = `speed ${ship.speed.toFixed(1)}u/s`;
    const driftLabel = `drift x${ship.vx.toFixed(1)} y${ship.vy.toFixed(1)}`;
    ctx.fillText(speedLabel, padding + 12, padding + 12);
    ctx.fillText(driftLabel, padding + 12, padding + 36);

    ctx.fillStyle = '#6eb1ff';
    ctx.font = '13px monospace';
    ctx.fillText('WASD / arrows steer', padding + 12, padding + 64);
    ctx.fillText('shift boost · space brake', padding + 12, padding + 84);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#4ddbff';
    ctx.fillText(`objects ${spaceObjects.length}`, padding + 230 - 12, padding + 12);
    ctx.textAlign = 'left';
  }

  function loop() {
    const now = performance.now();
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;

    updateShip(dt);
    updateObjects(dt);

    drawBackground();
    drawObjects();
    drawShip();
    drawHud(dt);

    requestAnimationFrame(loop);
  }

  resize();
  attachEvents();
  initField();
  requestAnimationFrame(loop);
})();
