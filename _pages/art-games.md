---
layout: games
permalink: /art/games/
title: games
---

<article class="card mb-4 shadow-sm">
  <div class="card-body">
    <h2 class="h5">rainbow ragdoll playground</h2>
    <p>click, fling, and tug on the ragdoll. hold anywhere on the canvas to tilt gravity toward your cursor.</p>
    <div class="embed-responsive embed-responsive-4by3">
      <canvas id="ragdoll-simulator" class="embed-responsive-item" role="img" aria-label="Interactive ragdoll simulation"></canvas>
    </div>
  </div>
</article>

<article class="card mb-4 shadow-sm">
  <div class="card-body">
    <h2 class="h5">mouse fractal painter</h2>
    <p>move your cursor across the canvas to morph a Julia set. the fractal palette shifts as you explore different complex constants.</p>
    <div class="embed-responsive embed-responsive-4by3">
      <canvas id="fractal-generator" class="embed-responsive-item" role="img" aria-label="Interactive fractal generator"></canvas>
    </div>
  </div>
</article>

<script src="{{ '/assets/js/ragdoll-playground.js' | relative_url }}" defer></script>
<script src="{{ '/assets/js/fractal-mouse-generator.js' | relative_url }}" defer></script>
