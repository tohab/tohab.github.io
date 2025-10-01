(() => {
  const container = document.getElementById('two-octave-piano');
  if (!container) return;

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

  const whiteLane = document.createElement('div');
  whiteLane.className = 'piano-whites';
  const blackLane = document.createElement('div');
  blackLane.className = 'piano-blacks';

  pianoSurface.appendChild(whiteLane);
  pianoSurface.appendChild(blackLane);
  container.appendChild(pianoSurface);

  const activeNotes = new Map();
  let audioContext = null;

  const baseKeyMap = new Map([
    ['KeyA', { offset: 0, label: 'A' }],
    ['KeyW', { offset: 1, label: 'W' }],
    ['KeyS', { offset: 2, label: 'S' }],
    ['KeyE', { offset: 3, label: 'E' }],
    ['KeyD', { offset: 4, label: 'D' }],
    ['KeyF', { offset: 5, label: 'F' }],
    ['KeyT', { offset: 6, label: 'T' }],
    ['KeyG', { offset: 7, label: 'G' }],
    ['KeyY', { offset: 8, label: 'Y' }],
    ['KeyH', { offset: 9, label: 'H' }],
    ['KeyU', { offset: 10, label: 'U' }],
    ['KeyJ', { offset: 11, label: 'J' }],
  ]);

  const offsetHotkeyLabel = new Map();
  baseKeyMap.forEach(entry => {
    offsetHotkeyLabel.set(entry.offset, entry.label);
  });

  const envelope = {
    attack: 0.02,
    decay: 0.12,
    sustain: 0.75,
    release: 0.25,
  };

  const quarterToneCents = 50;

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

    oscillator.type = 'triangle';
    oscillator.frequency.value = note.frequency;

    const now = ctx.currentTime;
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
    const hotkeyLabel = offsetHotkeyLabel.get(note.index % 12);
    if (hotkeyLabel) {
      const needsShift = note.index >= 12;
      const prefix = needsShift ? 'Shift+' : '';
      label.textContent = `${note.name} (${prefix}${hotkeyLabel})`;
    } else {
      label.textContent = note.name;
    }
    key.appendChild(label);

    key.addEventListener('pointerdown', event => {
      event.preventDefault();
      key.focus({ preventScroll: true });
      key.setPointerCapture(event.pointerId);
      const detune = event.getModifierState && event.getModifierState('ShiftRight') ? quarterToneCents : 0;
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
      if (event.code === 'Space' || event.key === 'Enter') {
        event.preventDefault();
        startNote(note, key);
      }
    });

    key.addEventListener('keyup', event => {
      if (event.code === 'Space' || event.key === 'Enter') {
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

  notes.forEach(note => {
    const key = buildKey(note);

    note.element = key;

    if (note.type === 'white') {
      whiteLane.appendChild(key);
    } else {
      key.style.width = `${blackKeyPercent}%`;
      const leftOffset = (note.whiteIndex + 1) * whiteKeyPercent - (blackKeyPercent / 2);
      key.style.left = `${leftOffset}%`;
      blackLane.appendChild(key);
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
    const base = baseKeyMap.get(event.code);
    if (!base) return;
    if (isTypingTarget(event.target)) return;

    const leftShift = event.getModifierState('ShiftLeft');
    const rightShift = event.getModifierState('ShiftRight');

    const noteIndex = base.offset + (leftShift ? 12 : 0);
    
    const note = notes[noteIndex];
    if (!note || !note.element) return;

    event.preventDefault();

    const detune = rightShift ? quarterToneCents : 0;
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
    const base = baseKeyMap.get(event.code);
    if (!base) return;

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

  document.addEventListener('keydown', handleKeyDown);
  document.addEventListener('keyup', handleKeyUp);
  document.addEventListener('keyup', event => {
    if (event.code === 'ShiftLeft' || event.code === 'ShiftRight') {
      releaseAllKeys();
    }
  });
  window.addEventListener('blur', releaseAllKeys);

  // Release any sustained notes if the page becomes hidden.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      releaseAllKeys();
      [...activeNotes.keys()].forEach(name => stopNote(name, true));
    }
  });
})();
