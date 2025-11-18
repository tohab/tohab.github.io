---
layout: games
permalink: /more/games/
title: games
collapsible_panels: true

---

<details class="collapsible-panel game-case">
  <summary>
    <h3>rainbow ragdoll playground</h3>
    <p>click, fling, and tug on the ragdoll. hold anywhere on the canvas to tilt gravity toward your cursor.</p>
  </summary>
  <div class="collapsible-panel__content">
    <div class="embed-responsive embed-responsive-4by3">
      <canvas id="ragdoll-simulator" class="embed-responsive-item" role="img" aria-label="Interactive ragdoll simulation"></canvas>
    </div>
  </div>
</details>

<details class="collapsible-panel game-case">
  <summary>
    <h3>mouse fractal painter</h3>
    <p>move your cursor across the canvas to morph a Julia set. the fractal palette shifts as you explore different complex constants.</p>
  </summary>
  <div class="collapsible-panel__content">
    <div class="embed-responsive embed-responsive-4by3">
      <canvas id="fractal-generator" class="embed-responsive-item" role="img" aria-label="Interactive fractal generator"></canvas>
    </div>
  </div>
</details>

<details class="collapsible-panel game-case">
  <summary>
    <h3>looping life garden</h3>
    <p>watch conway's game of life bloom on an endless torus. click or drag to seed new cells and nudge the color-shifting ecosystem.</p>
  </summary>
  <div class="collapsible-panel__content">
    <div class="embed-responsive embed-responsive-4by3">
      <canvas id="conway-life" class="embed-responsive-item" role="img" aria-label="Conway's Game of Life simulation"></canvas>
    </div>
  </div>
</details>

<details class="collapsible-panel game-case">
  <summary>
    <h3>two octave daydream piano</h3>
    <p>tap across a two-octave keyboard to play a lightweight synth piano. use the home row (A S D F G H J…) for white keys, the top row (W E T Y U…) for sharps, hold Shift for the upper octave, and hold Space or toggle the quarter-tone switch to nudge notes fifty cents up. holds let notes linger with a soft fade.</p>
  </summary>
  <div class="collapsible-panel__content">
    <div class="embed-responsive embed-responsive-21by9">
      <div id="two-octave-piano" class="interactive-piano embed-responsive-item" role="application" aria-label="Interactive two octave piano"></div>
    </div>
  </div>
</details>

<script src="{{ '/assets/js/ragdoll-playground.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/fractal-mouse-generator.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/conway-life.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/two-octave-piano.js' | relative_url }}" defer></script>
