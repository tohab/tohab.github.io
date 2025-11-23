---
layout: null
title: mouse fractal painter
summary: >-
  move your cursor across the canvas to morph a Julia set. the fractal palette
  shifts as you explore different complex constants.
element_tag: canvas
element_id: fractal-generator
element_class: embed-responsive-item
element_role: img
element_aria_label: Interactive fractal generator
aspect_ratio: embed-responsive-4by3
order: 2
---

(() => {
  const canvas = document.getElementById('fractal-generator');
  if (!canvas) return;

  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  const pointer = { x: 0.5, y: 0.5 };
  const viewScale = 3.0;
  const maxIterations = 80;
  let width = 0;
  let height = 0;
  let dpr = window.devicePixelRatio || 1;
  let pendingRender = false;

  const palette = new Array(maxIterations + 1).fill(0).map((_, i) => {
    if (i === maxIterations) return [9, 9, 20, 255];
    const t = i / maxIterations;
    const r = Math.round(40 + 215 * Math.pow(t, 0.5));
    const g = Math.round(30 + 200 * t);
    const b = Math.round(60 + 180 * (1 - Math.pow(t, 0.35)));
    return [r, g, b, 255];
  });

  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    dpr = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(width * dpr));
    canvas.height = Math.max(1, Math.round(height * dpr));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestRender();
  }

  function requestRender() {
    if (pendingRender) return;
    pendingRender = true;
    requestAnimationFrame(render);
  }

  function render() {
    pendingRender = false;
    const pixelWidth = canvas.width;
    const pixelHeight = canvas.height;
    const imageData = ctx.createImageData(pixelWidth, pixelHeight);
    const data = imageData.data;
    const aspect = pixelWidth / pixelHeight;

    const cRe = (pointer.x * 2 - 1) * 1.4;
    const cIm = (pointer.y * 2 - 1) * 1.4;

    let offset = 0;
    for (let py = 0; py < pixelHeight; py += 1) {
      const y0 = ((py / pixelHeight) - 0.5) * viewScale;
      for (let px = 0; px < pixelWidth; px += 1) {
        const x0 = ((px / pixelWidth) - 0.5) * viewScale * aspect;
        let zx = x0;
        let zy = y0;
        let iteration = 0;

        while (zx * zx + zy * zy <= 4 && iteration < maxIterations) {
          const temp = zx * zx - zy * zy + cRe;
          zy = 2 * zx * zy + cIm;
          zx = temp;
          iteration += 1;
        }

        const color = palette[iteration];
        data[offset] = color[0];
        data[offset + 1] = color[1];
        data[offset + 2] = color[2];
        data[offset + 3] = color[3];
        offset += 4;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    pointer.y = Math.min(1, Math.max(0, (event.clientY - rect.top) / rect.height));
    requestRender();
  }

  canvas.addEventListener('pointerdown', updatePointer);
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerenter', updatePointer);

  window.addEventListener('resize', resize);

  resize();
  requestRender();
})();
