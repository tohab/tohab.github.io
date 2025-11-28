---
layout: null
title: two octave daydream piano
summary: >-
  tap across a two-octave keyboard to play a lightweight synth piano. use the
  home row (A S D F G H J...) for white keys, the top row (W E T Y U...) for
  sharps, hold Shift for the upper octave, and hold Space or toggle the
  quarter-tone switch to nudge notes fifty cents up. holds let notes linger with
  a soft fade.
element_tag: div
element_id: two-octave-piano
element_class: "interactive-piano embed-responsive-item"
element_role: application
element_aria_label: Interactive two octave piano
aspect_ratio: embed-responsive-21by9
order: 4
---

(() => {
  const container = document.getElementById('two-octave-piano');
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

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    container.textContent = 'Your browser does not support the Web Audio API required for this piano.';
    container.classList.add('piano-unsupported');
    return;
  }

  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const totalNotes = 24; // two octaves
  const startingMidi = 60; // Middle C (C4)

  const notes = [];
  let whiteIndex = -1;

  function midiToFrequency(midiNumber) {
    return 440 * Math.pow(2, (midiNumber - 69) / 12);
  }

  for (let i = 0; i < totalNotes; i += 1) {
    const midiNumber = startingMidi + i;
    const nameBase = noteNames[midiNumber % 12];
    const octave = Math.floor(midiNumber / 12) - 1;
    const isBlack = nameBase.includes('#');

    if (!isBlack) {
      whiteIndex += 1;
    }

    notes.push({
      name: `${nameBase}${octave}`,
      type: isBlack ? 'black' : 'white',
      frequency: midiToFrequency(midiNumber),
      whiteIndex,
      index: i,
    });
  }

  const totalWhiteKeys = notes.filter(note => note.type === 'white').length;
  const whiteKeyPercent = 100 / totalWhiteKeys;
  const blackKeyPercent = whiteKeyPercent * 0.6;

  const pianoSurface = document.createElement('div');
  pianoSurface.className = 'piano-surface';

  const controls = document.createElement('div');
  controls.className = 'piano-controls';

  const whiteLane = document.createElement('div');
  whiteLane.className = 'piano-whites';
  const blackLane = document.createElement('div');
  blackLane.className = 'piano-blacks';

  pianoSurface.appendChild(whiteLane);
  pianoSurface.appendChild(blackLane);
  container.appendChild(controls);
  container.appendChild(pianoSurface);

  const activeNotes = new Map();
  let audioContext = null;

  const baseKeyMap = new Map([
    ['KeyA', 0],
    ['KeyW', 1],
    ['KeyS', 2],
    ['KeyE', 3],
    ['KeyD', 4],
    ['KeyF', 5],
    ['KeyT', 6],
    ['KeyG', 7],
    ['KeyY', 8],
    ['KeyH', 9],
    ['KeyU', 10],
    ['KeyJ', 11],
  ]);

  const envelope = {
    attack: 0.02,
    decay: 0.12,
    sustain: 0.75,
    release: 0.25,
  };

  const quarterToneCents = 50;
  let quarterToneModifier = false;
  let quarterToneLatch = false;
  let quarterToneHold = false;
  let quarterToneButton = null;

  function applyQuarterToneState() {
    const active = quarterToneLatch || quarterToneHold;
    if (quarterToneModifier === active) return;
    quarterToneModifier = active;
    container.classList.toggle('quarter-tone-active', quarterToneModifier);
    releaseAllKeys();
  }

  function setQuarterToneLatch(active) {
    if (quarterToneLatch === active) return;
    quarterToneLatch = active;
    if (quarterToneButton) {
      quarterToneButton.setAttribute('aria-pressed', String(quarterToneLatch));
      quarterToneButton.textContent = quarterToneLatch ? 'Quarter Tone · On' : 'Quarter Tone · Off';
    }
    applyQuarterToneState();
  }

  function setQuarterToneHold(active) {
    if (quarterToneHold === active) return;
    quarterToneHold = active;
    applyQuarterToneState();
  }

  function ensureContext() {
    if (!audioContext) {
      audioContext = new AudioContextClass();
    }
    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }
    return audioContext;
  }

  function startNote(note, element, detuneCents = 0) {
    const ctx = ensureContext();
    if (!ctx) return;

    if (activeNotes.has(note.name)) {
      stopNote(note.name, true);
    }

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    const now = ctx.currentTime;

    oscillator.type = 'triangle';
    oscillator.frequency.value = note.frequency;
    oscillator.detune.setValueAtTime(detuneCents, now);
    const peakLevel = 0.85;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peakLevel, now + envelope.attack);
    gain.gain.linearRampToValueAtTime(peakLevel * envelope.sustain, now + envelope.attack + envelope.decay);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(now);

    activeNotes.set(note.name, {
      oscillator,
      gain,
      element,
      detuneCents,
    });

    element.classList.add('is-active');
  }

  function stopNote(noteName, fast = false) {
    if (!audioContext) return;

    const entry = activeNotes.get(noteName);
    if (!entry) return;

    const { oscillator, gain, element } = entry;
    const ctx = audioContext;
    const now = ctx.currentTime;
    const releaseTime = fast ? Math.min(0.08, envelope.release / 2) : envelope.release;

    gain.gain.cancelScheduledValues(now);
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + releaseTime);

    oscillator.stop(now + releaseTime + 0.05);

    activeNotes.delete(noteName);
    element.classList.remove('is-active');
  }

  function buildKey(note) {
    const key = document.createElement('button');
    key.type = 'button';
    key.className = `piano-key piano-key--${note.type}`;
    key.dataset.note = note.name;
    key.setAttribute('aria-label', `Play note ${note.name}`);

    const label = document.createElement('span');
    label.className = 'piano-key__label';
    const baseName = note.name.replace(/\d+/g, '');
    const octaveMatch = note.name.match(/\d+/);

    const baseSpan = document.createElement('span');
    baseSpan.className = 'piano-key__label-text';
    baseSpan.textContent = baseName;
    label.appendChild(baseSpan);

    if (octaveMatch) {
      const octaveSpan = document.createElement('span');
      octaveSpan.className = 'piano-key__label-octave';
      octaveSpan.textContent = octaveMatch[0];
      label.appendChild(octaveSpan);
    }

    key.appendChild(label);

    key.addEventListener('pointerdown', event => {
      event.preventDefault();
      key.focus({ preventScroll: true });
      key.setPointerCapture(event.pointerId);
      const detune = quarterToneModifier ? quarterToneCents : 0;
      startNote(note, key, detune);
    });

    key.addEventListener('pointerup', event => {
      if (key.hasPointerCapture(event.pointerId)) {
        key.releasePointerCapture(event.pointerId);
      }
      stopNote(note.name);
    });

    key.addEventListener('pointercancel', event => {
      if (key.hasPointerCapture(event.pointerId)) {
        key.releasePointerCapture(event.pointerId);
      }
      stopNote(note.name);
    });

    key.addEventListener('lostpointercapture', () => {
      stopNote(note.name);
    });

    key.addEventListener('keydown', event => {
      if (event.repeat) return;
      if (event.key === 'Enter') {
        event.preventDefault();
        startNote(note, key, quarterToneModifier ? quarterToneCents : 0);
      }
    });

    key.addEventListener('keyup', event => {
      if (event.key === 'Enter') {
        event.preventDefault();
        stopNote(note.name);
      }
    });

    key.addEventListener('blur', () => {
      stopNote(note.name);
    });

    key.addEventListener('contextmenu', event => {
      event.preventDefault();
    });

    return key;
  }

  const whiteNotes = [];
  const blackNotes = [];

  notes.forEach(note => {
    const key = buildKey(note);

    note.element = key;

    if (note.type === 'white') {
      whiteLane.appendChild(key);
      whiteNotes.push(note);
    } else {
      key.style.width = `${blackKeyPercent}%`;
      const leftOffset = (note.whiteIndex + 1) * whiteKeyPercent - (blackKeyPercent / 2);
      key.style.left = `${leftOffset}%`;
      blackLane.appendChild(key);
      blackNotes.push(note);
    }
  });

  const pressedKeyNotes = new Map();

  function isTypingTarget(target) {
    if (!(target instanceof HTMLElement)) return false;
    if (target.isContentEditable) return true;
    const tagName = target.tagName;
    return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT' || target.closest('[contenteditable="true"]');
  }

  function handleKeyDown(event) {
    if (event.repeat) return;
    if (event.code === 'Space') {
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setQuarterToneHold(true);
      return;
    }

    const offset = baseKeyMap.get(event.code);
    if (offset === undefined) return;
    if (isTypingTarget(event.target)) return;

    const useUpperOctave = event.shiftKey;
    const noteIndex = offset + (useUpperOctave ? 12 : 0);

    const note = notes[noteIndex];
    if (!note || !note.element) return;

    event.preventDefault();

    const detune = quarterToneModifier ? quarterToneCents : 0;
    const existing = pressedKeyNotes.get(event.code);
    if (existing && existing.noteName === note.name && existing.detune === detune) {
      return;
    }

    if (existing) {
      stopNote(existing.noteName, true);
    }

    pressedKeyNotes.set(event.code, { noteName: note.name, detune });
    startNote(note, note.element, detune);
  }

  function handleKeyUp(event) {
    if (event.code === 'Space') {
      if (isTypingTarget(event.target)) return;
      event.preventDefault();
      setQuarterToneHold(false);
      return;
    }

    const offset = baseKeyMap.get(event.code);
    if (offset === undefined) return;

    const info = pressedKeyNotes.get(event.code);
    if (!info) return;

    pressedKeyNotes.delete(event.code);
    stopNote(info.noteName);
    event.preventDefault();
  }

  function releaseAllKeys() {
    pressedKeyNotes.forEach(entry => stopNote(entry.noteName, true));
    pressedKeyNotes.clear();
  }

  manageEvent(document, 'keydown', handleKeyDown);
  manageEvent(document, 'keyup', handleKeyUp);
  manageEvent(window, 'blur', () => {
    releaseAllKeys();
    setQuarterToneHold(false);
    setQuarterToneLatch(false);
  });

  // Release any sustained notes if the page becomes hidden.
  manageEvent(document, 'visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      releaseAllKeys();
      setQuarterToneHold(false);
      setQuarterToneLatch(false);
      [...activeNotes.keys()].forEach(name => stopNote(name, true));
    }
  });

  quarterToneButton = document.createElement('button');
  quarterToneButton.type = 'button';
  quarterToneButton.className = 'piano-mode-toggle';
  quarterToneButton.textContent = 'Quarter Tone · Off';
  quarterToneButton.setAttribute('aria-pressed', 'false');
  quarterToneButton.addEventListener('click', () => {
    setQuarterToneLatch(!quarterToneLatch);
  });
  controls.appendChild(quarterToneButton);

  function positionBlackKeys() {
    if (!blackNotes.length) return;

    const surfaceRect = pianoSurface.getBoundingClientRect();
    if (!surfaceRect.width) return;

    const whiteRects = whiteNotes.map(whiteNote => {
      if (!whiteNote.element) return null;
      return whiteNote.element.getBoundingClientRect();
    });

    blackNotes.forEach(note => {
      const keyElement = note.element;
      if (!keyElement) return;

      const previousWhiteRect = whiteRects[note.whiteIndex];
      const nextWhiteRect = whiteRects[note.whiteIndex + 1];
      if (!previousWhiteRect || !nextWhiteRect) return;

      const keyWidth = keyElement.offsetWidth;
      if (!keyWidth) return;

      const center = (previousWhiteRect.right + nextWhiteRect.left) / 2;
      const leftPx = center - keyWidth / 2;
      const widthPercent = (keyWidth / surfaceRect.width) * 100;
      const rawLeftPercent = ((leftPx - surfaceRect.left) / surfaceRect.width) * 100;
      const clampedLeft = Math.min(
        Math.max(rawLeftPercent, 0),
        Math.max(0, 100 - widthPercent),
      );

      keyElement.style.left = `${clampedLeft}%`;
    });
  }

  let pendingFrame = null;
  function scheduleBlackKeyLayout() {
    if (pendingFrame !== null) return;
    pendingFrame = requestAnimationFrame(() => {
      pendingFrame = null;
      positionBlackKeys();
    });
  }

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(() => {
      scheduleBlackKeyLayout();
    });
    observer.observe(pianoSurface);
  } else {
    manageEvent(window, 'resize', scheduleBlackKeyLayout);
  }

  manageEvent(window, 'orientationchange', scheduleBlackKeyLayout);

  if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
    document.fonts.ready.then(() => {
      if (!controller || controller.isActive()) {
        scheduleBlackKeyLayout();
      }
    }).catch(() => {});
  }

  function handleActivation(active) {
    if (active) {
      scheduleBlackKeyLayout();
      return;
    }
    releaseAllKeys();
    setQuarterToneHold(false);
    setQuarterToneLatch(false);
    [...activeNotes.keys()].forEach(name => stopNote(name, true));
    if (audioContext && typeof audioContext.suspend === 'function') {
      audioContext.suspend().catch(() => {});
    }
  }

  if (controller) {
    controller.onChange(handleActivation);
  } else {
    scheduleBlackKeyLayout();
  }
})();
