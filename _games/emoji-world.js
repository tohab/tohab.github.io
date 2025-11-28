---
layout: game
title: emoji wanderer
summary: >-
  roam through an endlessly generated emoji diorama. the camera follows from
  above as you stroll grassy meadows, tidepools, cozy plazas, and dreamy
  constellations.
element_tag: canvas
element_id: emoji-world
element_class: embed-responsive-item
element_role: img
element_aria_label: procedurally generated emoji landscape
aspect_ratio: embed-responsive-4by3
order: 5
---

(() => {
  const canvas = document.getElementById('emoji-world');
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
  let tileSize = 64;
  let lastTime = performance.now();
  let elapsed = 0;
  let frameHandle = null;
  let running = false;

  const CHUNK_W = 12;
  const CHUNK_H = 8;
  const RECYCLE_RADIUS = 4;
  const worldSeed = ((Date.now() >>> 0) ^ 0x9e3779b1) >>> 0;

  const player = {
    x: 0.5,
    y: 0.5,
    vx: 0,
    vy: 0,
    maxSpeed: 3.5,
    accel: 10,
    drag: 6,
    sprite: {
      idle: '🧍‍♂️',
      walk: '🚶‍♂️',
      run: '🏃‍♂️',
    },
    chat: '',
    chatTimer: 0,
    isMoving: false,
  };

  const camera = { x: player.x, y: player.y, easing: 5 };
  const input = { up: false, down: false, left: false, right: false };
  const pointer = { active: false, dx: 0, dy: 0 };
  const world = new Map();
  const inventory = [];
  const inventoryIndex = new Map();
  const party = [];
  const partyIndex = new Map();
  let partyTotal = 0;
  const PARTY_LIMIT = 6;
  const encounterState = {
    active: false,
    creature: null,
    biome: null,
    message: '',
    banner: '',
  };
  let encounterCooldown = 1.5;

  const BIOMES = [
    {
      id: 'meadow',
      name: 'Blooming Meadow',
      weight: 4,
      sky: ['#a5ecff', '#f6ffe3'],
      haze: 'rgba(255,255,255,0.35)',
      floor: ['🌱', '🌿', '🍀', '🌾', '🍃'],
      encounters: {
        rate: 0.18,
        floors: ['🌱', '🌿', '🍀', '🌾'],
      },
      features: [
        {
          glyph: '🌼',
          blocking: false,
          bark: 'daisies sway hello.',
          collectible: {
            id: 'wildflower',
            name: 'Wildflower Sprig',
            emoji: '🌼',
            message: 'you bundle bright petals!',
          },
        },
        {
          glyph: '🍄',
          blocking: false,
          bark: 'mushrooms whisper secrets.',
          collectible: {
            id: 'mushroom',
            name: 'Tiny Mushroom',
            emoji: '🍄',
            message: 'you pocket a tiny mushroom.',
          },
        },
        { glyph: '🌳', blocking: true, tall: true, bark: 'shade from a gentle tree.' },
        {
          glyph: '🪺',
          blocking: false,
          bark: 'a quiet little nest.',
          collectible: {
            id: 'feather',
            name: 'Downy Feather',
            emoji: '🪶',
            message: 'a stray feather joins your satchel.',
          },
        },
      ],
      featureDensity: 0.1,
      critters: ['🦋', '🐝', '🐞'],
      sparkleGlyph: '✨',
      sparkleRate: 0.25,
    },
    {
      id: 'tide',
      name: 'Tidepools',
      weight: 3,
      sky: ['#78c9ff', '#c6f0ff'],
      haze: 'rgba(64,131,206,0.25)',
      floor: ['🌊', '🪸', '🐚', '💎', '🩵'],
      encounters: {
        rate: 0.12,
        floors: ['🌊', '🪸', '🐚'],
      },
      features: [
        {
          glyph: '🪼',
          blocking: false,
          bark: 'a jellyfish bobs quietly.',
          collectible: {
            id: 'jelly',
            name: 'Biolum Jelly',
            emoji: '🪼',
            message: 'you bottle a gentle glow.',
          },
        },
        {
          glyph: '🐠',
          blocking: false,
          bark: 'tiny fish dart past.',
          collectible: {
            id: 'scale',
            name: 'Opal Scale',
            emoji: '🐠',
            message: 'a shimmering scale clings to you.',
          },
        },
        { glyph: '🪨', blocking: true, bark: 'a tide-worn stone.' },
        {
          glyph: '🏝️',
          blocking: false,
          tall: true,
          bark: 'a tiny sandbar.',
          collectible: {
            id: 'shell',
            name: 'Spiral Shell',
            emoji: '🐚',
            message: 'you tuck away a spiral shell.',
          },
        },
      ],
      featureDensity: 0.08,
      critters: ['🐚', '🦀', '🐡'],
      sparkleGlyph: '💧',
      sparkleRate: 0.2,
    },
    {
      id: 'plaza',
      name: 'Pocket Plaza',
      weight: 3,
      sky: ['#ffd4b8', '#fff5ea'],
      haze: 'rgba(255,199,168,0.3)',
      floor: ['🧱', '🛣️', '🪙', '🪵'],
      encounters: {
        rate: 0.1,
        floors: ['🛣️', '🧱'],
      },
      features: [
        {
          glyph: '🏵️',
          blocking: false,
          bark: 'a plaza planter blooms.',
          collectible: {
            id: 'pin',
            name: 'Flower Pin',
            emoji: '🏵️',
            message: 'you fasten a plaza pin.',
          },
        },
        { glyph: '🪑', blocking: true, bark: 'a bench invites a break.' },
        {
          glyph: '⛲',
          blocking: false,
          tall: true,
          bark: 'listen to the fountain.',
          collectible: {
            id: 'coin',
            name: 'Lucky Coin',
            emoji: '🪙',
            message: 'you fish out a lucky coin.',
          },
        },
        { glyph: '🏘️', blocking: true, tall: true, bark: 'miniature homes peek out.' },
      ],
      featureDensity: 0.12,
      critters: ['🕊️', '🐈', '🐕'],
      sparkleGlyph: '🌤️',
      sparkleRate: 0.15,
    },
    {
      id: 'cosmos',
      name: 'Starry Garden',
      weight: 2,
      sky: ['#1b1d40', '#3a2b5f'],
      haze: 'rgba(93,73,151,0.35)',
      floor: ['🌌', '⭐', '💠', '🔹'],
      encounters: {
        rate: 0.25,
        floors: ['🌌', '⭐', '💠'],
      },
      features: [
        {
          glyph: '🌠',
          blocking: false,
          bark: 'a comet leaves a trail.',
          collectible: {
            id: 'comet-tail',
            name: 'Comet Tail',
            emoji: '🌠',
            message: 'you snatch a comet tail!',
          },
        },
        { glyph: '🪐', blocking: true, tall: true, bark: 'a ringed planet drifts low.' },
        {
          glyph: '🔭',
          blocking: false,
          bark: 'set your sights on constellations.',
          collectible: {
            id: 'star-chart',
            name: 'Star Chart',
            emoji: '🗺️',
            message: 'a telescope sketch folds into your bag.',
          },
        },
        {
          glyph: '✨',
          blocking: false,
          bark: 'stardust tickles your shoes.',
          collectible: {
            id: 'stardust',
            name: 'Stardust Pinch',
            emoji: '✨',
            message: 'you gather glittering stardust.',
          },
        },
      ],
      featureDensity: 0.1,
      critters: ['🛸', '🌙', '⭐'],
      sparkleGlyph: '🌟',
      sparkleRate: 0.3,
    },
  ];

  const CREATURES = {
    meadow: [
      {
        id: 'spriglet',
        name: 'Spriglet',
        emoji: '🦊',
        type: 'bloom',
        flavor: 'a sprout-tailed foxlet who loves paths lined with moss.',
      },
      {
        id: 'lumifoal',
        name: 'Lumifoal',
        emoji: '🦄',
        type: 'bloom',
        flavor: 'a prismatic foal that braids light into the air.',
      },
      {
        id: 'padpup',
        name: 'Padpup',
        emoji: '🐕',
        type: 'bloom',
        flavor: 'a loyal buddy who naps beneath clover patches.',
      },
    ],
    tide: [
      {
        id: 'glimmerfin',
        name: 'Glimmerfin',
        emoji: '🐬',
        type: 'tide',
        flavor: 'a playful swimmer that keeps tidepool secrets.',
      },
      {
        id: 'mistril',
        name: 'Mistril',
        emoji: '🐧',
        type: 'tide',
        flavor: 'a breezy wanderer wrapped in seafoam feathers.',
      },
      {
        id: 'coralotl',
        name: 'Coralotl',
        emoji: '🦎',
        type: 'tide',
        flavor: 'a giggling axolotl with coral freckles.',
      },
    ],
    plaza: [
      {
        id: 'brickit',
        name: 'Brickit',
        emoji: '🧱',
        type: 'urban',
        flavor: 'a stout pal who stacks cozy plazas together.',
      },
      {
        id: 'clockette',
        name: 'Clockette',
        emoji: '⏰',
        type: 'urban',
        flavor: 'a tiny timekeeper with jangling keys.',
      },
      {
        id: 'fluttertail',
        name: 'Fluttertail',
        emoji: '🕊️',
        type: 'urban',
        flavor: 'a dove that guides travelers between courtyards.',
      },
    ],
    cosmos: [
      {
        id: 'starnib',
        name: 'Starnib',
        emoji: '🌟',
        type: 'cosmic',
        flavor: 'a scribbling mote that writes constellations mid-flight.',
      },
      {
        id: 'orbulo',
        name: 'Orbulo',
        emoji: '🪐',
        type: 'cosmic',
        flavor: 'a ringed wanderer humming lullabies.',
      },
      {
        id: 'moonbean',
        name: 'Moonbean',
        emoji: '🌙',
        type: 'cosmic',
        flavor: 'a sleepy crescent that wants to join your adventure.',
      },
    ],
  };

  const BIOME_WEIGHT = BIOMES.reduce((sum, biome) => sum + biome.weight, 0);

  const keyMap = {
    ArrowUp: 'up',
    ArrowDown: 'down',
    ArrowLeft: 'left',
    ArrowRight: 'right',
    w: 'up',
    a: 'left',
    s: 'down',
    d: 'right',
  };
  const actionKeys = {
    ' ': 'primary',
    Space: 'primary',
    Enter: 'primary',
    Spacebar: 'primary',
    Escape: 'secondary',
    Backspace: 'secondary',
  };
  const runtimeRng = mulberry32(worldSeed ^ 0xf00d);

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function lerp(a, b, t) {
    return a + (b - a) * clamp(t, 0, 1);
  }

  function mod(n, m) {
    return ((n % m) + m) % m;
  }

  function hash2dSeed(cx, cy) {
    let h = worldSeed ^ Math.imul(cx, 374761393) ^ Math.imul(cy, 668265263);
    h = (h ^ (h >>> 13)) >>> 0;
    h = Math.imul(h, 1274126177);
    return (h ^ (h >>> 16)) >>> 0;
  }

  function hash2d(cx, cy) {
    return hash2dSeed(cx, cy) / 0xffffffff;
  }

  function mulberry32(a) {
    return function rng() {
      let t = (a += 0x6d2b79f5);
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function rngForChunk(cx, cy) {
    return mulberry32(hash2dSeed(cx, cy));
  }

  function pick(array, rand) {
    if (!array.length) return null;
    const index = Math.floor(rand * array.length) % array.length;
    return array[index];
  }

  function biomeForChunk(cx, cy) {
    const t = hash2d(cx, cy) * BIOME_WEIGHT;
    let accum = 0;
    for (const biome of BIOMES) {
      accum += biome.weight;
      if (t <= accum) return biome;
    }
    return BIOMES[BIOMES.length - 1];
  }

  function chunkKey(cx, cy) {
    return `${cx},${cy}`;
  }

  function recordInventoryItem(collectible) {
    let entry = inventoryIndex.get(collectible.id);
    if (!entry) {
      entry = {
        id: collectible.id,
        name: collectible.name,
        emoji: collectible.emoji,
        count: 0,
      };
      inventoryIndex.set(collectible.id, entry);
      inventory.push(entry);
    }
    entry.count += 1;
  }

  function recordCompanion(creature) {
    let entry = partyIndex.get(creature.id);
    if (!entry) {
      entry = {
        id: creature.id,
        name: creature.name,
        emoji: creature.emoji,
        flavor: creature.flavor,
        count: 0,
      };
      partyIndex.set(creature.id, entry);
      party.push(entry);
    }
    entry.count += 1;
    partyTotal += 1;
  }

  function partyCount() {
    return partyTotal;
  }

  function getChunk(cx, cy) {
    const key = chunkKey(cx, cy);
    let chunk = world.get(key);
    if (chunk) return chunk;
    chunk = generateChunk(cx, cy);
    world.set(key, chunk);
    return chunk;
  }

  function generateChunk(cx, cy) {
    const rand = rngForChunk(cx, cy);
    const biome = biomeForChunk(cx, cy);
    const tiles = new Array(CHUNK_W * CHUNK_H);
    const critters = [];
    const sparkles = [];

    for (let y = 0; y < CHUNK_H; y += 1) {
      for (let x = 0; x < CHUNK_W; x += 1) {
        const base = {
          base: pick(biome.floor, rand()),
          overlay: null,
          blocking: false,
          tall: false,
          bark: null,
          collectible: null,
          encounter: null,
          biomeId: biome.id,
        };

        if (rand() < biome.featureDensity) {
          const feature = pick(biome.features, rand());
          if (feature) {
            base.overlay = feature.glyph;
            base.blocking = !!feature.blocking;
            base.tall = !!feature.tall;
            base.bark = feature.bark || null;
            if (feature.collectible) {
              base.collectible = {
                id: feature.collectible.id,
                name: feature.collectible.name,
                emoji: feature.collectible.emoji || feature.glyph,
                message: feature.collectible.message,
              };
            }
          }
        }

        if (
          biome.encounters &&
          biome.encounters.floors &&
          biome.encounters.floors.includes(base.base)
        ) {
          base.encounter = {
            type: 'wild',
            rate: biome.encounters.rate,
          };
        }

        tiles[y * CHUNK_W + x] = base;
      }
    }

    const critterCount = rand() < 0.5 ? 1 : 0;
    for (let i = 0; i < critterCount; i += 1) {
      critters.push({
        x: rand() * CHUNK_W,
        y: rand() * CHUNK_H,
        glyph: pick(biome.critters, rand()),
        phase: rand() * Math.PI * 2,
        speed: 0.75 + rand() * 0.5,
      });
    }

    if (rand() < biome.sparkleRate) {
      sparkles.push({
        x: rand() * CHUNK_W,
        y: rand() * CHUNK_H,
        glyph: biome.sparkleGlyph,
        sway: rand() * Math.PI * 2,
      });
    }

    return { cx, cy, biome, tiles, critters, sparkles };
  }

  function getTile(tx, ty) {
    const gx = Math.floor(tx);
    const gy = Math.floor(ty);
    const chunkX = Math.floor(gx / CHUNK_W);
    const chunkY = Math.floor(gy / CHUNK_H);
    const chunk = getChunk(chunkX, chunkY);
    if (!chunk) return null;
    const localX = mod(gx, CHUNK_W);
    const localY = mod(gy, CHUNK_H);
    return chunk.tiles[localY * CHUNK_W + localX];
  }

  function ensureNeighborhood(cx, cy) {
    for (let y = cy - RECYCLE_RADIUS; y <= cy + RECYCLE_RADIUS; y += 1) {
      for (let x = cx - RECYCLE_RADIUS; x <= cx + RECYCLE_RADIUS; x += 1) {
        getChunk(x, y);
      }
    }
  }

  function recycleChunks(anchorX, anchorY) {
    for (const [key, chunk] of world.entries()) {
      if (
        Math.abs(chunk.cx - anchorX) > RECYCLE_RADIUS ||
        Math.abs(chunk.cy - anchorY) > RECYCLE_RADIUS
      ) {
        world.delete(key);
      }
    }
  }

  function pointerDirection() {
    if (!pointer.active) return null;
    const mag = Math.hypot(pointer.dx, pointer.dy);
    if (mag < 0.05) return null;
    return { x: pointer.dx / mag, y: pointer.dy / mag };
  }

  function currentChunkCoords() {
    return {
      cx: Math.floor(player.x / CHUNK_W),
      cy: Math.floor(player.y / CHUNK_H),
    };
  }

  function updatePlayer(dt) {
    if (encounterState.active) {
      player.vx *= 1 - clamp(player.drag * dt * 0.5, 0, 1);
      player.vy *= 1 - clamp(player.drag * dt * 0.5, 0, 1);
      player.isMoving = false;
      return;
    }
    let moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    player.isMoving = false;

    const pointerDir = pointerDirection();
    if (pointerDir) {
      moveX = pointerDir.x;
      moveY = pointerDir.y;
    }

    const mag = Math.hypot(moveX, moveY);
    if (mag > 0) {
      moveX /= mag;
      moveY /= mag;
    }
    player.isMoving = mag > 0;

    const targetVx = moveX * player.maxSpeed;
    const targetVy = moveY * player.maxSpeed;

    player.vx += (targetVx - player.vx) * Math.min(1, dt * player.accel);
    player.vy += (targetVy - player.vy) * Math.min(1, dt * player.accel);

    player.vx *= 1 - clamp(player.drag * dt * 0.1, 0, 1);
    player.vy *= 1 - clamp(player.drag * dt * 0.1, 0, 1);

    const prevX = player.x;
    const prevY = player.y;

    player.x += player.vx * dt;
    player.y += player.vy * dt;

    resolveCollisions(prevX, prevY);
    handleCollectibles();
    triggerBarks();
  }

  function resolveCollisions(prevX, prevY) {
    const tile = getTile(player.x, player.y);
    if (tile && tile.blocking) {
      player.x = prevX;
      player.y = prevY;
      player.vx *= -0.2;
      player.vy *= -0.2;
    }
  }

  function handleCollectibles() {
    const tile = getTile(player.x, player.y);
    if (!tile || !tile.collectible) return;

    const collectible = tile.collectible;
    tile.collectible = null;
    if (!tile.blocking) {
      tile.overlay = null;
    }
    recordInventoryItem(collectible);
    player.chat = collectible.message || `you tucked ${collectible.name}.`;
    player.chatTimer = 3.2;
  }

  function startEncounter(tile) {
    if (!tile || !tile.biomeId) return;
    const options = CREATURES[tile.biomeId];
    if (!options || !options.length) return;
    const pickIndex = Math.floor(runtimeRng() * options.length) % options.length;
    const creature = options[pickIndex];
    encounterState.active = true;
    encounterState.creature = creature;
    encounterState.biome = tile.biomeId;
    encounterState.banner = `${creature.name} wants to adventure with you!`;
    encounterState.message = '';
    encounterCooldown = 5;
    pointer.active = false;
    player.vx = 0;
    player.vy = 0;
    player.chat = `a wild ${creature.name}!`;
    player.chatTimer = 3.5;
  }

  function endEncounter(message) {
    encounterState.active = false;
    encounterState.creature = null;
    encounterState.message = message || '';
    encounterState.banner = '';
    if (message) {
      player.chat = message;
      player.chatTimer = 3.5;
    }
  }

  function befriendEncounter() {
    if (!encounterState.active || !encounterState.creature) return;
    if (partyCount() >= PARTY_LIMIT) {
      encounterState.message = 'your party is full · press Esc to let them roam.';
      return;
    }
    recordCompanion(encounterState.creature);
    endEncounter(`${encounterState.creature.name} joins your party!`);
  }

  function fleeEncounter() {
    if (!encounterState.active) return;
    endEncounter('maybe next time!');
  }

  function triggerBarks() {
    if (player.chatTimer > 0) return;

    const px = Math.floor(player.x);
    const py = Math.floor(player.y);

    for (let y = -1; y <= 1; y += 1) {
      for (let x = -1; x <= 1; x += 1) {
        const tile = getTile(px + x, py + y);
        if (tile && tile.bark) {
          player.chat = tile.bark;
          player.chatTimer = 3.5;
          return;
        }
      }
    }

    player.chat = '';
  }

  function updateCamera(dt) {
    camera.x = lerp(camera.x, player.x, dt * camera.easing);
    camera.y = lerp(camera.y, player.y, dt * camera.easing);
  }

  function updateChunks(dt) {
    const { cx, cy } = currentChunkCoords();
    ensureNeighborhood(cx, cy);
    recycleChunks(cx, cy);

    for (const chunk of world.values()) {
      for (const critter of chunk.critters) {
        critter.phase += dt * critter.speed;
      }
      for (const sparkle of chunk.sparkles) {
        sparkle.sway += dt;
      }
    }
  }

  function updateChat(dt) {
    if (player.chatTimer > 0) {
      player.chatTimer -= dt;
      if (player.chatTimer <= 0) {
        player.chatTimer = 0;
        player.chat = '';
      }
    }
  }

  function updateEncounters(dt) {
    encounterCooldown = Math.max(0, encounterCooldown - dt);
    if (encounterState.active) return;

    const speed = Math.hypot(player.vx, player.vy);
    if (speed < 0.35) return;

    const tile = getTile(player.x, player.y);
    if (!tile || !tile.encounter) return;
    if (encounterCooldown > 0) return;

    const rate = tile.encounter.rate || 0.08;
    const chance = rate * dt * 0.8;
    if (runtimeRng() < chance) {
      startEncounter(tile);
    }
  }

  function update(dt) {
    updatePlayer(dt);
    updateCamera(dt);
    updateChunks(dt);
    updateChat(dt);
    updateEncounters(dt);
  }

  function drawSky(activeBiome) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, activeBiome.sky[0]);
    gradient.addColorStop(1, activeBiome.sky[1]);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = activeBiome.haze;
    ctx.fillRect(0, 0, width, height);
  }

  function visibleTileBounds() {
    const halfCols = (width / tileSize) * 0.5 + 2;
    const halfRows = (height / tileSize) * 0.5 + 2;
    return {
      minX: Math.floor(camera.x - halfCols),
      maxX: Math.ceil(camera.x + halfCols),
      minY: Math.floor(camera.y - halfRows),
      maxY: Math.ceil(camera.y + halfRows),
    };
  }

  function drawTiles(time) {
    const { minX, maxX, minY, maxY } = visibleTileBounds();
    const overlays = [];

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    for (let ty = minY; ty <= maxY; ty += 1) {
      for (let tx = minX; tx <= maxX; tx += 1) {
        const tile = getTile(tx, ty);
        if (!tile) continue;

        const screenX = width / 2 + (tx + 0.5 - camera.x) * tileSize;
        const screenY = height / 2 + (ty + 0.5 - camera.y) * tileSize;

        ctx.font = `${tileSize * 0.82}px system-ui, apple color emoji, emoji`;
        ctx.fillText(tile.base, screenX, screenY);

        if (tile.overlay) {
          overlays.push({
            glyph: tile.overlay,
            tall: tile.tall,
            x: screenX,
            y: screenY + (tile.tall ? -tileSize * 0.15 : 0),
          });
        }
      }
    }

    for (const overlay of overlays) {
      const size = tileSize * (overlay.tall ? 1.1 : 0.95);
      ctx.font = `${size}px system-ui, apple color emoji, emoji`;
      ctx.fillText(overlay.glyph, overlay.x, overlay.y);
    }

    drawSprites(time, minX, maxX, minY, maxY);
  }

  function drawSprites(time, minX, maxX, minY, maxY) {
    const chunkMinX = Math.floor(minX / CHUNK_W);
    const chunkMaxX = Math.floor(maxX / CHUNK_W);
    const chunkMinY = Math.floor(minY / CHUNK_H);
    const chunkMaxY = Math.floor(maxY / CHUNK_H);

    for (let cy = chunkMinY; cy <= chunkMaxY; cy += 1) {
      for (let cx = chunkMinX; cx <= chunkMaxX; cx += 1) {
        const chunk = getChunk(cx, cy);
        if (!chunk) continue;

        for (const critter of chunk.critters) {
          const worldX = chunk.cx * CHUNK_W + critter.x + Math.sin(critter.phase) * 0.2;
          const worldY = chunk.cy * CHUNK_H + critter.y + Math.cos(critter.phase) * 0.1;
          drawEmoji(critter.glyph, worldX, worldY, tileSize * 0.9);
        }

        for (const sparkle of chunk.sparkles) {
          const bob = Math.sin(time * 2 + sparkle.sway) * 0.2;
          const worldX = chunk.cx * CHUNK_W + sparkle.x;
          const worldY = chunk.cy * CHUNK_H + sparkle.y + bob;
          drawEmoji(sparkle.glyph, worldX, worldY, tileSize * 0.8, 0.7);
        }
      }
    }
  }

  function drawEmoji(glyph, tileX, tileY, size, alpha = 1) {
    const screenX = width / 2 + (tileX + 0.5 - camera.x) * tileSize;
    const screenY = height / 2 + (tileY + 0.5 - camera.y) * tileSize;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `${size}px system-ui, apple color emoji, emoji`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, screenX, screenY);
    ctx.restore();
  }

  function currentPlayerEmoji() {
    const speed = Math.hypot(player.vx, player.vy);
    if (speed > 2.3) return player.sprite.run;
    if (speed > 0.25) return player.sprite.walk;
    return player.sprite.idle;
  }

  function drawPlayer() {
    drawEmoji(currentPlayerEmoji(), player.x, player.y, tileSize);
    if (player.chat) {
      const screenX = width / 2 + (player.x + 0.5 - camera.x) * tileSize;
      const screenY = height / 2 + (player.y - 0.2 - camera.y) * tileSize;
      ctx.font = `${tileSize * 0.38}px system-ui, emoji`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillText(player.chat, screenX + 2, screenY + 2);
      ctx.fillStyle = 'white';
      ctx.fillText(player.chat, screenX, screenY);
    }
  }

  function drawUI(activeBiome) {
    const text = `${activeBiome.name} · seed ${worldSeed.toString(16)}`;
    ctx.font = '16px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.fillText(text, 18, 20);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(text, 16, 18);
  }

  function drawInventory() {
    const panelWidth = 210;
    const rowHeight = 30;
    const padding = 12;
    const headerHeight = 24;
    const rows = Math.max(1, inventory.length);
    const panelHeight = headerHeight + rows * rowHeight + padding;
    const x = width - panelWidth - 16;
    const y = 18;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 3, y + 3, panelWidth, panelHeight);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(x, y, panelWidth, panelHeight);

    ctx.fillStyle = '#555';
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('satchel', x + padding, y + 6);

    if (!inventory.length) {
      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#777';
      ctx.fillText('empty · explore to collect keepsakes', x + padding, y + 24);
      ctx.restore();
      return;
    }

    inventory.forEach((entry, index) => {
      const rowY = y + headerHeight + index * rowHeight + padding * 0.3;
      ctx.font = '22px system-ui, apple color emoji, emoji';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.emoji, x + padding + 4, rowY + rowHeight / 2);

      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#444';
      ctx.fillText(entry.name, x + padding + 36, rowY + 8);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(`x${entry.count}`, x + panelWidth - padding - 24, rowY + 8);
    });

    ctx.restore();
  }

  function drawParty() {
    const cardWidth = 220;
    const padding = 10;
    const x = 16;
    const y = 48;
    const rows = Math.max(1, party.length);
    const rowHeight = 32;
    const height = padding * 2 + rows * rowHeight;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.fillRect(x + 2, y + 2, cardWidth, height);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(x, y, cardWidth, height);

    ctx.fillStyle = '#444';
    ctx.font = '600 14px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`party · ${partyCount()}/${PARTY_LIMIT}`, x + padding, y + 4);

    if (!party.length) {
      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#777';
      ctx.fillText('walk through tall grass to find friends!', x + padding, y + 24);
      ctx.restore();
      return;
    }

    party.slice(0, PARTY_LIMIT).forEach((entry, index) => {
      const rowY = y + padding + 16 + index * rowHeight;
      ctx.font = '22px system-ui, apple color emoji, emoji';
      ctx.textBaseline = 'middle';
      ctx.fillText(entry.emoji, x + padding + 4, rowY + rowHeight / 2 - 4);

      ctx.font = '13px system-ui, sans-serif';
      ctx.fillStyle = '#333';
      ctx.textBaseline = 'top';
      ctx.fillText(entry.name, x + padding + 38, rowY);

      ctx.font = '11px system-ui, sans-serif';
      ctx.fillStyle = '#666';
      ctx.fillText(entry.flavor, x + padding + 38, rowY + 16);

      ctx.font = '12px system-ui, sans-serif';
      ctx.fillStyle = '#444';
      ctx.textAlign = 'right';
      ctx.fillText(`x${entry.count}`, x + cardWidth - padding, rowY + 2);
      ctx.textAlign = 'left';
    });

    ctx.restore();
  }

  function drawEncounter() {
    if (!encounterState.active || !encounterState.creature) return;
    const panelWidth = Math.min(420, width - 32);
    const panelHeight = 140;
    const x = (width - panelWidth) / 2;
    const y = height - panelHeight - 24;
    const creature = encounterState.creature;

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 4, y - 4, panelWidth + 8, panelHeight + 8);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.fillRect(x, y, panelWidth, panelHeight);

    ctx.font = '64px system-ui, apple color emoji, emoji';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(creature.emoji, x + 24, y + panelHeight / 2);

    ctx.textBaseline = 'top';
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillStyle = '#222';
    ctx.fillText(`${creature.name} · ${creature.type}`, x + 108, y + 18);

    ctx.font = '13px system-ui, sans-serif';
    ctx.fillStyle = '#555';
    ctx.fillText(creature.flavor, x + 108, y + 44);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = '#2a2a2a';
    const banner =
      encounterState.banner || `${creature.name} wants to adventure with you!`;
    ctx.fillText(banner, x + 108, y + panelHeight - 54);

    ctx.font = '12px system-ui, sans-serif';
    ctx.fillStyle = encounterState.message ? '#b14343' : '#333';
    const prompt =
      encounterState.message || 'press space/click to befriend · esc to let them roam';
    ctx.fillText(prompt, x + 108, y + panelHeight - 32);

    ctx.restore();
  }

  function render() {
    const activeBiome = biomeForChunk(
      Math.floor(player.x / CHUNK_W),
      Math.floor(player.y / CHUNK_H)
    );
    drawSky(activeBiome);
    drawTiles(elapsed);
    drawPlayer();
    drawUI(activeBiome);
    drawParty();
    drawInventory();
    drawEncounter();
  }

  function tick(timestamp) {
    if (!running) {
      frameHandle = null;
      return;
    }
    const delta = Math.min(0.05, (timestamp - lastTime) / 1000);
    lastTime = timestamp;
    elapsed += delta;
    update(delta);
    render();
    frameHandle = requestAnimationFrame(tick);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * dpr));
    canvas.height = Math.max(1, Math.round(rect.height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    tileSize = Math.max(42, Math.min(width / (CHUNK_W - 4), height / (CHUNK_H - 2)));
  }

  function handleKey(event, isDown) {
    const action = actionKeys[event.key];
    if (action && isDown) {
      handleAction(action);
      event.preventDefault();
      return;
    }
    const key = keyMap[event.key];
    if (!key) return;
    input[key] = isDown;
    event.preventDefault();
  }

  function handleAction(type) {
    if (type === 'primary') {
      if (encounterState.active) {
        befriendEncounter();
      }
    } else if (type === 'secondary') {
      if (encounterState.active) {
        fleeEncounter();
      }
    }
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.dx = clamp((event.clientX - rect.left) / rect.width * 2 - 1, -1, 1);
    pointer.dy = clamp((event.clientY - rect.top) / rect.height * 2 - 1, -1, 1);
    pointer.active = true;
  }

  function releasePointer() {
    pointer.active = false;
  }

  manageEvent(window, 'resize', resize);
  manageEvent(document, 'visibilitychange', () => {
    lastTime = performance.now();
  });
  manageEvent(window, 'keydown', (event) => handleKey(event, true));
  manageEvent(window, 'keyup', (event) => handleKey(event, false));
  manageEvent(canvas, 'pointerdown', updatePointer);
  manageEvent(canvas, 'pointermove', (event) => {
    if (event.pressure === 0 && !pointer.active) return;
    if (event.buttons === 0 && !pointer.active) return;
    if (pointer.active) updatePointer(event);
  });
  manageEvent(window, 'pointerup', releasePointer);
  manageEvent(window, 'pointercancel', releasePointer);
  manageEvent(canvas, 'pointerleave', releasePointer);
  manageEvent(canvas, 'click', () => handleAction('primary'));

  function startWorld() {
    if (running) return;
    running = true;
    resize();
    lastTime = performance.now();
    frameHandle = requestAnimationFrame(tick);
  }

  function stopWorld() {
    running = false;
    pointer.active = false;
    pointer.dx = 0;
    pointer.dy = 0;
    Object.keys(input).forEach((key) => {
      input[key] = false;
    });
    if (frameHandle !== null) {
      cancelAnimationFrame(frameHandle);
      frameHandle = null;
    }
  }

  const { cx, cy } = currentChunkCoords();
  ensureNeighborhood(cx, cy);

  if (controller) {
    controller.onChange((active) => {
      if (active) {
        startWorld();
      } else {
        stopWorld();
      }
    });
  } else {
    startWorld();
  }
})();
