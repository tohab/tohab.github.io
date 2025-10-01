document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('escher-raycaster-game');
  if (!container) {
    return;
  }

  const VIEW_WIDTH = 640;
  const VIEW_HEIGHT = 360;
  const MINIMAP_SIZE = 156;
  const RAY_STEPS = VIEW_WIDTH;
  const STEP_SIZE = 0.02;
  const MAX_RAY_DISTANCE = 20;

  container.innerHTML = '';
  container.classList.add('escher-raycaster');
  container.style.position = 'relative';
  container.style.display = 'inline-block';
  container.style.padding = '16px';
  container.style.background = '#050711';
  container.style.color = '#d7e0ff';
  container.style.border = '1px solid rgba(120, 150, 255, 0.35)';
  container.style.boxShadow = '0 10px 32px rgba(10, 14, 40, 0.55)';
  container.style.maxWidth = `${VIEW_WIDTH + 32}px`;

  const title = document.createElement('h3');
  title.textContent = 'Escher Paradox Raycaster';
  title.style.margin = '0 0 12px 0';
  title.style.fontFamily = "'DM Mono', 'Fira Code', monospace";
  title.style.fontSize = '1.15rem';
  title.style.letterSpacing = '0.08em';
  title.style.textTransform = 'uppercase';
  title.style.color = '#87b3ff';
  container.appendChild(title);

  const canvasWrap = document.createElement('div');
  canvasWrap.style.position = 'relative';
  container.appendChild(canvasWrap);

  const canvas = document.createElement('canvas');
  canvas.width = VIEW_WIDTH;
  canvas.height = VIEW_HEIGHT;
  canvas.style.display = 'block';
  canvas.style.background = '#000714';
  canvas.style.borderRadius = '6px';
  canvas.style.border = '1px solid rgba(90, 120, 255, 0.45)';
  canvasWrap.appendChild(canvas);

  const ctx = canvas.getContext('2d');

  const minimap = document.createElement('canvas');
  minimap.width = MINIMAP_SIZE;
  minimap.height = MINIMAP_SIZE;
  minimap.style.position = 'absolute';
  minimap.style.top = '12px';
  minimap.style.right = '12px';
  minimap.style.border = '1px solid rgba(210, 220, 255, 0.25)';
  minimap.style.borderRadius = '6px';
  minimap.style.background = 'rgba(4, 8, 20, 0.78)';
  minimap.style.backdropFilter = 'blur(4px)';
  canvasWrap.appendChild(minimap);
  const miniCtx = minimap.getContext('2d');

  const hud = document.createElement('div');
  hud.style.display = 'flex';
  hud.style.justifyContent = 'space-between';
  hud.style.gap = '12px';
  hud.style.marginTop = '12px';
  hud.style.fontFamily = "'DM Mono', 'Fira Code', monospace";
  hud.style.fontSize = '0.85rem';
  container.appendChild(hud);

  const hudLeft = document.createElement('div');
  hudLeft.style.display = 'flex';
  hudLeft.style.flexDirection = 'column';
  hud.appendChild(hudLeft);

  const hudRight = document.createElement('div');
  hudRight.style.textAlign = 'right';
  hudRight.style.display = 'flex';
  hudRight.style.flexDirection = 'column';
  hud.appendChild(hudRight);

  const livesEl = document.createElement('span');
  const waveEl = document.createElement('span');
  const infoEl = document.createElement('span');
  hudLeft.appendChild(livesEl);
  hudLeft.appendChild(waveEl);
  hudRight.appendChild(infoEl);

  livesEl.textContent = 'Lives: 3';
  waveEl.textContent = 'Monsters remaining: 0';
  infoEl.textContent = 'Arrow keys to move - Space to shoot - Enter to replay';
  infoEl.style.opacity = '0.7';

  const overlay = document.createElement('div');
  overlay.style.position = 'absolute';
  overlay.style.top = '50%';
  overlay.style.left = '50%';
  overlay.style.transform = 'translate(-50%, -50%)';
  overlay.style.background = 'rgba(4, 8, 20, 0.92)';
  overlay.style.border = '1px solid rgba(136, 170, 255, 0.6)';
  overlay.style.borderRadius = '10px';
  overlay.style.padding = '24px 28px';
  overlay.style.textAlign = 'center';
  overlay.style.fontFamily = "'DM Mono', 'Fira Code', monospace";
  overlay.style.color = '#c8d6ff';
  overlay.style.textTransform = 'uppercase';
  overlay.style.letterSpacing = '0.08em';
  overlay.style.display = 'none';
  overlay.style.boxShadow = '0 16px 40px rgba(12, 18, 48, 0.65)';

  const overlayMessage = document.createElement('div');
  overlayMessage.style.marginBottom = '18px';
  overlayMessage.style.fontSize = '0.9rem';
  overlay.appendChild(overlayMessage);

  const overlayButton = document.createElement('button');
  overlayButton.textContent = 'Play Again';
  overlayButton.style.fontFamily = "'DM Mono', 'Fira Code', monospace";
  overlayButton.style.fontSize = '0.85rem';
  overlayButton.style.letterSpacing = '0.08em';
  overlayButton.style.textTransform = 'uppercase';
  overlayButton.style.padding = '10px 18px';
  overlayButton.style.background = 'linear-gradient(135deg, #5f8bff, #a86bff)';
  overlayButton.style.color = '#050713';
  overlayButton.style.border = 'none';
  overlayButton.style.borderRadius = '6px';
  overlayButton.style.cursor = 'pointer';
  overlayButton.style.boxShadow = '0 10px 20px rgba(60, 90, 220, 0.35)';
  overlay.appendChild(overlayButton);

  canvasWrap.appendChild(overlay);

  const mapWidth = 16;
  const mapHeight = 16;
  const map = [
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
    1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1,
    1, 0, 1, 0, 0, 0, 0, 3, 1, 0, 0, 0, 0, 1, 0, 1,
    1, 0, 1, 0, 1, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0, 1,
    1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 4, 1, 0, 1,
    1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 0, 1,
    1, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1,
    1, 0, 0, 1, 1, 1, 1, 0, 1, 1, 0, 1, 1, 1, 0, 1,
    1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 1, 0, 1,
    1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1,
    1, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 1, 5, 1,
    1, 0, 1, 0, 1, 1, 1, 1, 1, 1, 0, 1, 0, 1, 0, 1,
    1, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 1,
    1, 0, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 1,
    1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1
  ];

  const wallPalette = {
    1: '#203c94',
    2: '#983dde',
    3: '#2d7acb',
    4: '#34c3d9',
    5: '#d96acd',
    6: '#f1b55f'
  };

  const warpZones = [
    { x: 9, y: 1, w: 2, h: 2, tx: 9.5, ty: 13.5, angleShift: Math.PI, label: 'gravity inversion' },
    { x: 4, y: 10, w: 1, h: 1, tx: 12.5, ty: 5.5, angleShift: Math.PI / 2, label: 'sideways drop' },
    { x: 7, y: 7, w: 2, h: 1, tx: 3.5, ty: 3.5, angleShift: -Math.PI / 2, label: 'impossible bend' }
  ];

  const monsterSpawns = [
    { x: 3.5, y: 3.5 },
    { x: 11.5, y: 11.5 },
    { x: 6.5, y: 13.5 },
    { x: 12.5, y: 4.5 },
    { x: 8.3, y: 8.5 }
  ];

  const state = {
    player: {
      x: 2.5,
      y: 2.5,
      angle: Math.PI / 4,
      fov: Math.PI / 3,
      speed: 3.2,
      rotationSpeed: 2.35
    },
    monsters: [],
    bullets: [],
    keys: new Set(),
    lives: 3,
    cooldown: 0,
    playing: true,
    message: '',
    lastTimestamp: performance.now(),
    warpNoteTimer: 0,
    warpNote: ''
  };

  const resetGame = () => {
    state.player.x = 2.5;
    state.player.y = 2.5;
    state.player.angle = Math.PI / 4;
    state.monsters = monsterSpawns.map((spawn, index) => ({
      id: index,
      x: spawn.x,
      y: spawn.y,
      alive: true,
      orbitPhase: Math.random() * Math.PI * 2
    }));
    state.bullets = [];
    state.lives = 3;
    state.cooldown = 0;
    state.playing = true;
    state.message = '';
    state.warpNote = '';
    state.warpNoteTimer = 0;
    overlay.style.display = 'none';
  };

  const tileIndex = (x, y) => y * mapWidth + x;

  const getTile = (x, y) => {
    const gx = Math.floor(x);
    const gy = Math.floor(y);
    if (gx < 0 || gy < 0 || gx >= mapWidth || gy >= mapHeight) {
      return 1;
    }
    return map[tileIndex(gx, gy)];
  };

  const isWalkable = (x, y) => getTile(x, y) === 0;

  const handleWarp = (entity) => {
    for (const warp of warpZones) {
      if (
        entity.x > warp.x &&
        entity.x < warp.x + warp.w &&
        entity.y > warp.y &&
        entity.y < warp.y + warp.h
      ) {
        entity.x = warp.tx;
        entity.y = warp.ty;
        if (typeof entity.angle === 'number') {
          entity.angle = normalizeAngle(entity.angle + warp.angleShift);
        }
        state.warpNote = warp.label.toUpperCase();
        state.warpNoteTimer = 2;
        break;
      }
    }
  };

  const normalizeAngle = (angle) => {
    let a = angle;
    while (a < 0) {
      a += Math.PI * 2;
    }
    while (a >= Math.PI * 2) {
      a -= Math.PI * 2;
    }
    return a;
  };

  const handleInput = (dt) => {
    const { player, keys } = state;
    if (!state.playing) {
      return;
    }

    const moveStep = player.speed * dt;
    const rotateStep = player.rotationSpeed * dt;

    if (keys.has('ArrowLeft')) {
      player.angle = normalizeAngle(player.angle - rotateStep);
    }
    if (keys.has('ArrowRight')) {
      player.angle = normalizeAngle(player.angle + rotateStep);
    }

    let moveX = 0;
    let moveY = 0;

    if (keys.has('ArrowUp')) {
      moveX += Math.cos(player.angle) * moveStep;
      moveY += Math.sin(player.angle) * moveStep;
    }
    if (keys.has('ArrowDown')) {
      moveX -= Math.cos(player.angle) * moveStep * 0.7;
      moveY -= Math.sin(player.angle) * moveStep * 0.7;
    }

    const targetX = player.x + moveX;
    const targetY = player.y + moveY;

    if (isWalkable(targetX, player.y)) {
      player.x = targetX;
    }
    if (isWalkable(player.x, targetY)) {
      player.y = targetY;
    }

    handleWarp(player);
  };

  const castRay = (angle) => {
    let distance = 0;
    let x = state.player.x;
    let y = state.player.y;
    const sin = Math.sin(angle);
    const cos = Math.cos(angle);

    for (let step = 0; step < MAX_RAY_DISTANCE / STEP_SIZE; step++) {
      distance += STEP_SIZE;
      x += cos * STEP_SIZE;
      y += sin * STEP_SIZE;

      const tile = getTile(x, y);
      if (tile > 0) {
        const distortion = 1 + 0.45 * Math.sin(0.9 * y + 1.3 * Math.cos(0.8 * x));
        return {
          distance,
          tile,
          hitX: x,
          hitY: y,
          distortion
        };
      }
    }

    return {
      distance: MAX_RAY_DISTANCE,
      tile: 0,
      hitX: x,
      hitY: y,
      distortion: 1
    };
  };

  const render3D = () => {
    ctx.fillStyle = '#040716';
    ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

    const { player } = state;
    const halfHeight = VIEW_HEIGHT / 2;
    const angleStep = player.fov / RAY_STEPS;

    for (let column = 0; column < RAY_STEPS; column++) {
      const rayAngle = player.angle - player.fov / 2 + column * angleStep;
      const ray = castRay(rayAngle);
      const corrected = ray.distance * Math.cos(rayAngle - player.angle);
      const height = Math.min(VIEW_HEIGHT, (VIEW_HEIGHT / corrected) * ray.distortion * 0.9);

      const shadeBase = wallPalette[ray.tile] || '#374099';
      const shadeFactor = 0.6 + 0.4 * Math.cos(ray.hitX * 1.3 + ray.hitY * 0.7);
      ctx.fillStyle = applyShade(shadeBase, shadeFactor);
      ctx.fillRect(column, halfHeight - height / 2, 1, height);

      const floorHeight = VIEW_HEIGHT - (halfHeight + height / 2);
      if (floorHeight > 0) {
        const gradient = ctx.createLinearGradient(0, halfHeight + height / 2, 0, VIEW_HEIGHT);
        gradient.addColorStop(0, 'rgba(19, 30, 55, 0.65)');
        gradient.addColorStop(1, 'rgba(8, 10, 18, 0.9)');
        ctx.fillStyle = gradient;
        ctx.fillRect(column, halfHeight + height / 2, 1, floorHeight);
      }

      const ceilingHeight = halfHeight - height / 2;
      if (ceilingHeight > 0) {
        const gradient = ctx.createLinearGradient(0, 0, 0, halfHeight - height / 2);
        gradient.addColorStop(0, 'rgba(18, 28, 48, 0.95)');
        gradient.addColorStop(1, 'rgba(12, 18, 34, 0.7)');
        ctx.fillStyle = gradient;
        ctx.fillRect(column, 0, 1, ceilingHeight);
      }
    }

    drawBullets();
    drawMonsters3D();
  };

  const applyShade = (hex, factor) => {
    const num = parseInt(hex.replace('#', ''), 16);
    let r = ((num >> 16) & 255) * factor;
    let g = ((num >> 8) & 255) * factor;
    let b = (num & 255) * factor;
    r = Math.max(0, Math.min(255, Math.round(r)));
    g = Math.max(0, Math.min(255, Math.round(g)));
    b = Math.max(0, Math.min(255, Math.round(b)));
    return `rgb(${r}, ${g}, ${b})`;
  };

  const drawBullets = () => {
    ctx.fillStyle = '#f9f1a7';
    const { bullets } = state;
    const { player } = state;
    bullets.forEach((bullet) => {
      const dx = bullet.x - player.x;
      const dy = bullet.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angleToBullet = Math.atan2(dy, dx) - player.angle;
      const size = Math.max(2, 6 / (distance + 0.2));
      const screenX = (VIEW_WIDTH / 2) + Math.tan(angleToBullet) * (VIEW_WIDTH / 2) / Math.tan(player.fov / 2);
      const screenY = VIEW_HEIGHT / 2;
      ctx.beginPath();
      ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
      ctx.fill();
    });
  };

  const drawMonsters3D = () => {
    const { monsters, player } = state;
    monsters.forEach((monster) => {
      if (!monster.alive) {
        return;
      }
      const dx = monster.x - player.x;
      const dy = monster.y - player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const angleToMonster = normalizeAngle(Math.atan2(dy, dx) - player.angle);
      const relativeAngle = ((angleToMonster + Math.PI) % (Math.PI * 2)) - Math.PI;
      if (Math.abs(relativeAngle) > player.fov / 1.6) {
        return;
      }
      const size = Math.min(220, (VIEW_HEIGHT * 0.8) / (distance + 0.1));
      const screenX = (VIEW_WIDTH / 2) + Math.tan(relativeAngle) * (VIEW_WIDTH / 2) / Math.tan(player.fov / 2);
      const screenY = VIEW_HEIGHT / 2 + Math.sin(monster.orbitPhase) * 6;
      const gradient = ctx.createLinearGradient(0, screenY - size / 2, 0, screenY + size / 2);
      gradient.addColorStop(0, 'rgba(252, 102, 176, 0.8)');
      gradient.addColorStop(1, 'rgba(95, 210, 255, 0.65)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, size * 0.35, size * 0.6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(screenX, screenY, size * 0.35, size * 0.6, 0, 0, Math.PI * 2);
      ctx.stroke();
    });
  };

  const renderMinimap = () => {
    miniCtx.fillStyle = 'rgba(6, 10, 22, 0.92)';
    miniCtx.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

    const scale = MINIMAP_SIZE / mapWidth;

    for (let y = 0; y < mapHeight; y++) {
      for (let x = 0; x < mapWidth; x++) {
        const tile = map[tileIndex(x, y)];
        if (tile > 0) {
          miniCtx.fillStyle = `${wallPalette[tile] || '#3f4c9e'}55`;
          miniCtx.fillRect(x * scale, y * scale, scale, scale);
        }
      }
    }

    warpZones.forEach((warp) => {
      miniCtx.fillStyle = 'rgba(255, 215, 120, 0.42)';
      miniCtx.fillRect(warp.x * scale, warp.y * scale, warp.w * scale, warp.h * scale);
    });

    state.monsters.forEach((monster) => {
      if (!monster.alive) {
        return;
      }
      miniCtx.fillStyle = '#ff4b7a';
      miniCtx.beginPath();
      miniCtx.arc(monster.x * scale, monster.y * scale, scale * 0.3, 0, Math.PI * 2);
      miniCtx.fill();
    });

    miniCtx.fillStyle = '#f2f5ff';
    const px = state.player.x * scale;
    const py = state.player.y * scale;
    miniCtx.beginPath();
    miniCtx.arc(px, py, scale * 0.35, 0, Math.PI * 2);
    miniCtx.fill();

    miniCtx.strokeStyle = 'rgba(177, 204, 255, 0.6)';
    miniCtx.beginPath();
    miniCtx.moveTo(px, py);
    miniCtx.lineTo(
      px + Math.cos(state.player.angle) * scale * 1.5,
      py + Math.sin(state.player.angle) * scale * 1.5
    );
    miniCtx.stroke();
  };

  const updateMonsters = (dt) => {
    const player = state.player;
    state.monsters.forEach((monster) => {
      if (!monster.alive) {
        return;
      }

      monster.orbitPhase += dt * 2.4;
      const dx = player.x - monster.x;
      const dy = player.y - monster.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      const speed = 1.35 + 0.35 * Math.sin(monster.orbitPhase * 0.5);
      const dirX = (dx / (distance || 1)) * speed * dt;
      const dirY = (dy / (distance || 1)) * speed * dt;

      const nextX = monster.x + dirX;
      const nextY = monster.y + dirY;

      if (isWalkable(nextX, monster.y)) {
        monster.x = nextX;
      }
      if (isWalkable(monster.x, nextY)) {
        monster.y = nextY;
      }

      handleWarp(monster);

      if (distance < 0.6) {
        state.lives -= 1;
        monster.alive = false;
        if (state.lives <= 0) {
          triggerLose();
        }
      }
    });
  };

  const updateBullets = (dt) => {
    const speed = 9.5;
    state.bullets.forEach((bullet) => {
      bullet.x += Math.cos(bullet.angle) * speed * dt;
      bullet.y += Math.sin(bullet.angle) * speed * dt;
      bullet.life -= dt;
      handleWarp(bullet);
    });

    state.bullets = state.bullets.filter((bullet) => {
      if (bullet.life <= 0) {
        return false;
      }
      if (!isWalkable(bullet.x, bullet.y)) {
        return false;
      }
      let hit = false;
      state.monsters.forEach((monster) => {
        if (!monster.alive || hit) {
          return;
        }
        const dx = monster.x - bullet.x;
        const dy = monster.y - bullet.y;
        if (dx * dx + dy * dy < 0.2) {
          monster.alive = false;
          hit = true;
        }
      });
      return !hit;
    });
  };

  const triggerWin = () => {
    state.playing = false;
    state.message = 'Topology Stabilized';
    overlayMessage.textContent = 'YOU SHATTERED THE MONSTER LOOP. SPACE RESPECTS YOU NOW.';
    overlay.style.display = 'block';
  };

  const triggerLose = () => {
    if (!state.playing) {
      return;
    }
    state.playing = false;
    state.message = 'Folded Into Infinity';
    overlayMessage.textContent = 'THE PARADOX CONSUMED YOUR 3 LIVES. TRY AGAIN?';
    overlay.style.display = 'block';
  };

  const shoot = () => {
    if (state.cooldown > 0 || !state.playing) {
      return;
    }
    const muzzleX = state.player.x + Math.cos(state.player.angle) * 0.4;
    const muzzleY = state.player.y + Math.sin(state.player.angle) * 0.4;
    state.bullets.push({
      x: muzzleX,
      y: muzzleY,
      angle: state.player.angle,
      life: 1.3
    });
    state.cooldown = 0.3;
  };

  const updateHUD = () => {
    const alive = state.monsters.filter((monster) => monster.alive).length;
    livesEl.textContent = `Lives: ${state.lives}`;
    waveEl.textContent = `Monsters remaining: ${alive}`;

    if (state.warpNoteTimer > 0) {
      infoEl.textContent = `${state.warpNote} - Arrow keys to move - Space to shoot`;
      infoEl.style.opacity = '1';
    } else if (!state.playing && state.message) {
      infoEl.textContent = `${state.message} - Press Play Again`;
      infoEl.style.opacity = '1';
    } else {
      infoEl.textContent = 'Arrow keys to move - Space to shoot - Enter to replay';
      infoEl.style.opacity = '0.7';
    }
  };

  const checkVictory = () => {
    const alive = state.monsters.some((monster) => monster.alive);
    if (!alive && state.playing) {
      triggerWin();
    }
  };

  const loop = (timestamp) => {
    const dt = Math.min(0.05, (timestamp - state.lastTimestamp) / 1000);
    state.lastTimestamp = timestamp;

    if (state.cooldown > 0) {
      state.cooldown = Math.max(0, state.cooldown - dt);
    }

    if (state.warpNoteTimer > 0) {
      state.warpNoteTimer = Math.max(0, state.warpNoteTimer - dt);
    }

    handleInput(dt);
    updateBullets(dt);
    updateMonsters(dt);
    render3D();
    renderMinimap();
    updateHUD();
    checkVictory();

    requestAnimationFrame(loop);
  };

  document.addEventListener('keydown', (event) => {
    if (event.code === 'Space') {
      event.preventDefault();
      shoot();
      return;
    }
    if (event.code === 'Enter') {
      if (!state.playing) {
        resetGame();
      }
      return;
    }
    state.keys.add(event.key);
  });

  document.addEventListener('keyup', (event) => {
    state.keys.delete(event.key);
  });

  overlayButton.addEventListener('click', () => {
    resetGame();
  });

  resetGame();
  requestAnimationFrame((timestamp) => {
    state.lastTimestamp = timestamp;
    requestAnimationFrame(loop);
  });
});
