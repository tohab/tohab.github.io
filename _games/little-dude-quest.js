---
layout: game
title: tiny horizon sprint
summary: >-
  guide a tiny adventurer across improvised ledges, hopping over pits and
  dodging monsters. reach the shimmering gate to trigger a freshly generated
  course.
element_tag: canvas
element_id: tiny-horizon-platformer
element_class: embed-responsive-item
element_role: img
element_aria_label: Auto-generated side scrolling platformer
aspect_ratio: embed-responsive-4by3
order: 6
---

(() => {
  const canvas = document.getElementById('tiny-horizon-platformer');
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
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  let lastTime = performance.now();
  let frameHandle = null;
  let running = false;

  const input = { left: false, right: false };
  let jumpBuffer = 0;
  const JUMP_BUFFER_TIME = 0.16;
  const GRAVITY = 2300;
  const MOVE_ACCEL = 1700;
  const MAX_SPEED = 520;
  const MAX_FALL = 1600;
  const FRICTION_GROUND = 12;
  const FRICTION_AIR = 3;
  const JUMP_VELOCITY = 760;
  const COYOTE_TIME = 0.09;
  const MAX_ASCENT = 110;
  const MIN_GAP = 70;
  const MAX_GAP = 210;
  const GAP_SAFETY = 0.82;

  const player = {
    x: 0,
    y: 0,
    width: 28,
    height: 40,
    vx: 0,
    vy: 0,
    onGround: false,
    coyote: 0,
    spawnX: 0,
    spawnY: 0,
    invuln: 0,
  };

  let camera = { x: 0, y: 0 };
  let levelLength = 0;
  let platforms = [];
  let monsters = [];
  let goal = null;
  let skyGradient = null;
  let message = '';
  let messageTimer = 0;
  const clouds = [];

  const colors = {
    skyTop: '#251a4a',
    skyBottom: '#031726',
    platform: ['#2dd0ff', '#29f29d', '#f06543', '#ffd25a'],
    monster: ['#fd4775', '#ff9f1c', '#00cfc1'],
    playerFill: '#fefef7',
    playerOutline: '#141118',
    goal: '#8cf9ff',
  };

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
    skyGradient = ctx.createLinearGradient(0, 0, 0, height);
    skyGradient.addColorStop(0, colors.skyTop);
    skyGradient.addColorStop(1, colors.skyBottom);
    seedClouds();
    generateLevel('freshly built run!');
  }

  function rand(min, max) {
    return min + Math.random() * (max - min);
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function rectsOverlap(a, b) {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  function sparkMessage(text) {
    message = text;
    messageTimer = 2.2;
  }

  function computeReachableGap(deltaY) {
    const travelTerm = JUMP_VELOCITY * JUMP_VELOCITY + 2 * GRAVITY * deltaY;
    if (travelTerm <= 0) {
      return MIN_GAP;
    }
    const airTime = (JUMP_VELOCITY + Math.sqrt(travelTerm)) / GRAVITY;
    return airTime * MAX_SPEED * GAP_SAFETY;
  }

  function generateLevel(msg = 'new layout!') {
    const sectionCount = Math.floor(rand(6, 10));
    const minY = height * 0.25;
    const maxY = height - 90;
    let cursorX = 0;
    let cursorY = height - 110;
    platforms = [];
    monsters = [];

    const sectionHeights = [];
    for (let i = 0; i < sectionCount; i += 1) {
      let deltaY = rand(-150, 150);
      if (deltaY < -MAX_ASCENT) {
        deltaY = -MAX_ASCENT;
      }
      cursorY = clamp(cursorY + deltaY, minY, maxY);
      sectionHeights.push(cursorY);
    }

    for (let i = 0; i < sectionHeights.length; i += 1) {
      const platformWidth = rand(160, 320);
      const currentY = sectionHeights[i];
      platforms.push({
        x: cursorX,
        y: currentY,
        width: platformWidth,
        height: 18,
        hueIndex: i % colors.platform.length,
      });

      if (i > 0 && Math.random() < 0.6) {
        const plat = platforms[platforms.length - 1];
        const patrolMargin = 18;
        monsters.push({
          x: rand(plat.x + patrolMargin, plat.x + plat.width - patrolMargin - 32),
          y: plat.y - 26,
          width: 30,
          height: 26,
          vx: Math.random() < 0.5 ? -70 : 70,
          minX: plat.x + patrolMargin,
          maxX: plat.x + plat.width - patrolMargin - 30,
          color: colors.monster[Math.floor(rand(0, colors.monster.length)) | 0],
        });
      }

      if (i < sectionHeights.length - 1) {
        const deltaToNext = sectionHeights[i + 1] - currentY;
        const reachableGap = Math.max(MIN_GAP, Math.min(MAX_GAP, computeReachableGap(deltaToNext)));
        cursorX += platformWidth + rand(MIN_GAP, reachableGap);
      } else {
        cursorX += platformWidth;
      }

      if (i < sectionHeights.length - 1 && Math.random() < 0.4) {
        const floatingWidth = rand(80, 150);
        const floatRise = rand(60, 140);
        const floatingY = clamp(
          currentY - Math.min(floatRise, MAX_ASCENT - 10),
          minY,
          currentY - 40
        );
        platforms.push({
          x: cursorX - floatingWidth * 0.6,
          y: floatingY,
          width: floatingWidth,
          height: 14,
          hueIndex: (i + 1) % colors.platform.length,
        });
      }
    }

    levelLength = cursorX + 240;
    const lastHeight = sectionHeights[sectionHeights.length - 1] || height - 110;
    goal = {
      x: levelLength - 120,
      y: clamp(lastHeight - 80, minY + 30, maxY - 60),
      width: 48,
      height: 80,
    };

    const firstPlat = platforms[0];
    player.x = firstPlat.x + 32;
    player.y = firstPlat.y - player.height - 4;
    player.spawnX = player.x;
    player.spawnY = player.y;
    player.vx = 0;
    player.vy = 0;
    player.coyote = 0;
    player.invuln = 0;
    jumpBuffer = 0;
    sparkMessage(msg);
  }

  function queueJump() {
    jumpBuffer = JUMP_BUFFER_TIME;
  }

  function handleInput(dt) {
    const moveDir = (input.left ? -1 : 0) + (input.right ? 1 : 0);
    const targetAccel = moveDir * MOVE_ACCEL;
    player.vx += targetAccel * dt;
    const friction = player.onGround ? FRICTION_GROUND : FRICTION_AIR;
    player.vx -= player.vx * friction * dt;
    player.vx = clamp(player.vx, -MAX_SPEED, MAX_SPEED);
  }

  function moveWithCollision(entity, dx, dy) {
    entity.x += dx;
    for (const solid of platforms) {
      if (!rectsOverlap(entity, solid)) continue;
      if (dx > 0) {
        entity.x = solid.x - entity.width;
      } else if (dx < 0) {
        entity.x = solid.x + solid.width;
      }
      if (entity === player) {
        entity.vx = 0;
      }
    }

    entity.y += dy;
    let grounded = false;
    for (const solid of platforms) {
      if (!rectsOverlap(entity, solid)) continue;
      if (dy > 0) {
        entity.y = solid.y - entity.height;
        grounded = true;
      } else if (dy < 0) {
        entity.y = solid.y + solid.height;
      }
      if (entity === player) {
        entity.vy = 0;
      }
    }
    if (entity === player) {
      player.onGround = grounded;
    }
  }

  function updatePlayer(dt) {
    player.invuln = Math.max(0, player.invuln - dt);
    player.coyote = player.onGround ? COYOTE_TIME : Math.max(0, player.coyote - dt);
    handleInput(dt);
    player.vy = clamp(player.vy + GRAVITY * dt, -Infinity, MAX_FALL);

    if (jumpBuffer > 0) {
      jumpBuffer -= dt;
      if (player.onGround || player.coyote > 0) {
        player.vy = -JUMP_VELOCITY;
        player.onGround = false;
        player.coyote = 0;
        jumpBuffer = 0;
      }
    }

    moveWithCollision(player, player.vx * dt, player.vy * dt);

    if (player.onGround) {
      player.coyote = COYOTE_TIME;
    } else if (player.coyote === COYOTE_TIME) {
      player.coyote -= dt;
    }

    const fallLimit = height + 220;
    if (player.y > fallLimit) {
      respawn('whoops!');
    }
  }

  function respawn(msg) {
    player.x = player.spawnX;
    player.y = player.spawnY;
    player.vx = 0;
    player.vy = 0;
    player.onGround = false;
    player.invuln = 0.8;
    sparkMessage(msg);
  }

  function updateMonsters(dt) {
    for (let i = monsters.length - 1; i >= 0; i -= 1) {
      const mob = monsters[i];
      mob.x += mob.vx * dt;
      if (mob.x < mob.minX) {
        mob.x = mob.minX;
        mob.vx *= -1;
      } else if (mob.x + mob.width > mob.maxX) {
        mob.x = mob.maxX - mob.width;
        mob.vx *= -1;
      }

      if (!rectsOverlap(player, mob)) continue;
      const playerBottom = player.y + player.height;
      const mobTop = mob.y;
      if (player.vy > 0 && playerBottom - mobTop < 16) {
        monsters.splice(i, 1);
        player.vy = -JUMP_VELOCITY * 0.65;
        sparkMessage('stomp!');
      } else if (player.invuln <= 0) {
        respawn('bonked by a blob');
      }
    }
  }

  function updateGoal() {
    if (goal && rectsOverlap(player, goal)) {
      generateLevel('new random route!');
    }
  }

  function updateCamera(dt) {
    const targetX = clamp(player.x + player.width / 2 - width / 2, 0, Math.max(0, levelLength - width));
    const targetY = clamp(player.y + player.height / 2 - height / 2, 0, Math.max(0, height));
    camera.x += (targetX - camera.x) * Math.min(1, dt * 5);
    camera.y += (targetY - camera.y) * Math.min(1, dt * 5);
  }

  function update(dt) {
    updatePlayer(dt);
    updateMonsters(dt);
    updateGoal();
    updateCamera(dt);
    updateClouds(dt);
    messageTimer = Math.max(0, messageTimer - dt);
  }

  function roundedRectPath(x, y, w, h, r = 8) {
    const radius = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + w - radius, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
    ctx.lineTo(x + w, y + h - radius);
    ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
    ctx.lineTo(x + radius, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  function drawPlatforms() {
    for (const plat of platforms) {
      ctx.fillStyle = colors.platform[plat.hueIndex % colors.platform.length];
      ctx.fillRect(plat.x - camera.x, plat.y - camera.y, plat.width, plat.height);
      ctx.fillStyle = 'rgba(10,10,20,0.35)';
      ctx.fillRect(plat.x - camera.x, plat.y - camera.y + plat.height - 4, plat.width, 4);
    }
  }

  function drawMonsters() {
    for (const mob of monsters) {
      ctx.fillStyle = mob.color;
      const x = mob.x - camera.x;
      const y = mob.y - camera.y;
      roundedRectPath(x, y, mob.width, mob.height, 8);
      ctx.fill();
      ctx.fillStyle = '#010006';
      ctx.fillRect(x + 8, y + 10, 4, 6);
      ctx.fillRect(x + mob.width - 12, y + 10, 4, 6);
    }
  }

  function drawPlayer() {
    const x = player.x - camera.x;
    const y = player.y - camera.y;
    ctx.fillStyle = player.invuln > 0 && Math.sin(performance.now() * 0.02) > 0 ? '#ffced6' : colors.playerFill;
    ctx.strokeStyle = colors.playerOutline;
    ctx.lineWidth = 2;
    roundedRectPath(x, y, player.width, player.height, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = colors.playerOutline;
    ctx.fillRect(x + 8, y + 14, 4, 6);
    ctx.fillRect(x + player.width - 12, y + 14, 4, 6);
    ctx.fillRect(x + player.width / 2 - 6, y + player.height - 10, 12, 4);
  }

  function drawGoal() {
    if (!goal) return;
    const x = goal.x - camera.x;
    const y = goal.y - camera.y;
    ctx.fillStyle = colors.goal;
    ctx.strokeStyle = '#0c3a4e';
    ctx.lineWidth = 3;
    roundedRectPath(x, y, goal.width, goal.height, 12);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#0c3a4e';
    ctx.fillRect(x + goal.width / 2 - 4, y + 12, 8, goal.height - 20);
    ctx.fillStyle = '#ff66c4';
    ctx.beginPath();
    ctx.moveTo(x + goal.width / 2 - 4, y + 14);
    ctx.lineTo(x + goal.width / 2 - 4, y + 48);
    ctx.lineTo(x + goal.width / 2 + 32, y + 36);
    ctx.closePath();
    ctx.fill();
  }

  function drawHUD() {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(12, 12, 240, 64);
    ctx.fillStyle = '#f7f5ff';
    ctx.font = '16px "Trebuchet MS", "Segoe UI", sans-serif';
    ctx.fillText('← → / A D to run', 24, 36);
    ctx.fillText('space / ↑ / W to jump', 24, 58);

    if (messageTimer > 0) {
      ctx.fillStyle = 'rgba(8,7,12,0.65)';
      ctx.fillRect(width / 2 - 150, 24, 300, 48);
      ctx.fillStyle = '#fefbff';
      ctx.font = '20px "Trebuchet MS", "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(message, width / 2, 56);
      ctx.textAlign = 'start';
    }
  }

  function drawBackground() {
    ctx.fillStyle = skyGradient;
    ctx.fillRect(0, 0, width, height);
    const horizon = ctx.createLinearGradient(0, height * 0.7, 0, height);
    horizon.addColorStop(0, 'rgba(255,142,193,0.1)');
    horizon.addColorStop(1, 'rgba(255,221,113,0.2)');
    ctx.fillStyle = horizon;
    ctx.fillRect(0, 0, width, height);
    drawClouds();
    ctx.fillStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i < 40; i += 1) {
      const starX = (i * 97 + performance.now() * 0.01) % (width + 200) - 100;
      const starY = ((i * 53) % height) * 0.5 + 20;
      ctx.fillRect(starX, starY, 2, 2);
    }
  }

  function seedClouds() {
    clouds.length = 0;
    const cloudCount = Math.max(6, Math.round(width / 90));
    for (let i = 0; i < cloudCount; i += 1) {
      clouds.push({
        x: Math.random() * (width + 200) - 100,
        y: rand(20, height * 0.45),
        scale: rand(40, 110),
        speed: rand(10, 30),
        fluff: Math.random() * 0.4 + 0.6,
        layer: Math.random() < 0.4 ? 0.8 : 1,
      });
    }
  }

  function updateClouds(dt) {
    for (const cloud of clouds) {
      cloud.x += cloud.speed * dt;
      if (cloud.x > width + 140) {
        cloud.x = -160;
        cloud.y = rand(20, height * 0.45);
        cloud.scale = rand(40, 110);
        cloud.speed = rand(10, 30);
      }
    }
  }

  function drawClouds() {
    for (const cloud of clouds) {
      const x = cloud.x;
      const y = cloud.y;
      const w = cloud.scale * 2;
      const h = cloud.scale * 0.6;
      ctx.save();
      ctx.globalAlpha = 0.35 * cloud.fluff;
      ctx.fillStyle = cloud.layer > 0.9 ? '#fdfaff' : '#d6efff';
      roundedRectPath(x - camera.x * 0.08, y, w, h, h / 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function render() {
    drawBackground();
    ctx.save();
    drawPlatforms();
    drawGoal();
    drawMonsters();
    drawPlayer();
    ctx.restore();
    drawHUD();
  }

  function loop(now) {
    if (!running) {
      frameHandle = null;
      return;
    }
    const dt = Math.min((now - lastTime) / 1000, 1 / 30);
    lastTime = now;
    update(dt);
    render();
    frameHandle = requestAnimationFrame(loop);
  }

  function setKeyState(event, isDown) {
    if (event.repeat) return;
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        input.left = isDown;
        event.preventDefault();
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        input.right = isDown;
        event.preventDefault();
        break;
      case 'ArrowUp':
      case 'w':
      case 'W':
      case ' ':
        if (isDown) queueJump();
        event.preventDefault();
        break;
      default:
        break;
    }
  }

  manageEvent(window, 'keydown', (event) => setKeyState(event, true));
  manageEvent(window, 'keyup', (event) => setKeyState(event, false));
  manageEvent(window, 'blur', () => {
    input.left = false;
    input.right = false;
  });
  manageEvent(window, 'resize', resize);

  function startRun() {
    if (running) return;
    running = true;
    resize();
    lastTime = performance.now();
    frameHandle = requestAnimationFrame(loop);
  }

  function stopRun() {
    running = false;
    input.left = false;
    input.right = false;
    jumpBuffer = 0;
    if (frameHandle !== null) {
      cancelAnimationFrame(frameHandle);
      frameHandle = null;
    }
  }

  if (controller) {
    controller.onChange((active) => {
      if (active) {
        startRun();
      } else {
        stopRun();
      }
    });
  } else {
    startRun();
  }
})();
