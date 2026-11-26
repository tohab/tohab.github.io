// Work portfolio motion: section reveals, line-by-line unfurl, reading
// progress, the margin spine (fill line, case dots, sticky case label),
// numbers that count up, the chapter bar (where you are) and the skim
// switch (bold lead-ins only).
(function () {
  const root = document.querySelector("[data-work]");
  if (!root) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const progress = root.querySelector(".work-progress");
  const timeline = root.querySelector("[data-timeline]");
  const cases = Array.from(root.querySelectorAll("[data-case]"));
  const units = Array.from(root.querySelectorAll(".work-u"));
  const sections = root.querySelectorAll(".work-sect");

  // Stagger siblings that arrive together (e.g. a short list already on screen).
  let batch = 0;
  let batchTimer = null;
  function reveal(el) {
    el.style.setProperty("--d", `${Math.min(batch, 4) * 0.04}s`);
    batch += 1;
    clearTimeout(batchTimer);
    batchTimer = setTimeout(() => (batch = 0), 120);
    el.classList.add("is-in");
  }

  // Count a figure up from zero, keeping its words and symbols ("1 → 4", "$2.5M").
  function count(el) {
    if (reduceMotion || el.dataset.counted) return;
    el.dataset.counted = "1";
    const text = el.textContent;
    const parts = text.split(/(\d+(?:\.\d+)?)/);
    if (parts.length < 2) return;
    const t0 = performance.now();
    const dur = 900;
    function frame(now) {
      const k = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = parts
        .map((p, i) => {
          if (i % 2 === 0) return p;
          const decimals = (p.split(".")[1] || "").length;
          return (parseFloat(p) * e).toFixed(decimals);
        })
        .join("");
      if (k < 1) requestAnimationFrame(frame);
      else el.textContent = text;
    }
    requestAnimationFrame(frame);
  }

  // Grow each impact bar to match how many of its items have arrived.
  function growImpact(block) {
    const items = block.querySelectorAll(".work-u");
    const shown = block.querySelectorAll(".work-u.is-in").length;
    block.style.setProperty("--grow", items.length ? shown / items.length : 1);
  }

  // Lines unfurl from the scroll loop (not IntersectionObserver: Chrome treats
  // a fully clipped element as invisible, so it would never fire).
  const animate = !reduceMotion && "IntersectionObserver" in window;
  let pending = animate ? units.slice() : [];
  if (animate) {
    root.classList.add("work--animate");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.05 }
    );
    sections.forEach((s) => io.observe(s));
  }

  function unfurl() {
    if (!pending.length) return;
    const line = window.innerHeight; // start as soon as a line enters the screen
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top > line) return true;
      reveal(el);
      const figure = el.querySelector("[data-count]");
      if (figure) setTimeout(() => count(figure), 150);
      const impact = el.closest(".work-impact");
      if (impact) growImpact(impact);
      return false;
    });
  }

  // The five figures in the intro count up as the page opens.
  if (animate) {
    root.querySelectorAll(".work-glance [data-count]").forEach((el, i) => setTimeout(() => count(el), 700 + i * 90));
  }

  // Skim: fold every line down to its bold lead-in. Remembered between visits.
  const skim = root.querySelector("[data-skim]");
  if (skim) {
    skim.hidden = false;
    const setSkim = (on) => {
      root.classList.toggle("work--skim", on);
      skim.setAttribute("aria-pressed", String(on));
      try {
        localStorage.setItem("work-skim", on ? "1" : "0");
      } catch (e) {}
    };
    let saved = false;
    try {
      saved = localStorage.getItem("work-skim") === "1";
    } catch (e) {}
    setSkim(saved);
    skim.addEventListener("click", () => {
      setSkim(skim.getAttribute("aria-pressed") !== "true");
      onScroll();
    });
  }

  // The chapter bar sticks just under the site navbar, whatever its height.
  const navbar = document.querySelector(".navbar");
  function fitBar() {
    if (navbar) root.style.setProperty("--work-bar-top", `${navbar.offsetHeight}px`);
  }
  fitBar();
  window.addEventListener("resize", fitBar);

  // Chapter bar: mark where you are.
  const bar = root.querySelector("[data-bar]");
  const barLinks = bar ? Array.from(bar.querySelectorAll("[data-bar-link]")) : [];
  const barTargets = barLinks.map((a) => document.getElementById(a.dataset.barLink)).filter(Boolean);
  let activeLink = null;
  function markBar() {
    if (!bar) return;
    const line = bar.getBoundingClientRect().bottom + 60;
    let id = null;
    barTargets.forEach((t) => {
      if (t.getBoundingClientRect().top < line) id = t.id;
    });
    const link = id ? bar.querySelector(`[data-bar-link="${id}"]`) : null;
    if (link === activeLink) return;
    if (activeLink) activeLink.classList.remove("is-active");
    activeLink = link;
    if (!link) return;
    link.classList.add("is-active");
    // Keep the active item in view when the bar scrolls sideways (phones).
    const inner = bar.firstElementChild;
    const lb = link.getBoundingClientRect();
    const ib = inner.getBoundingClientRect();
    if (lb.left < ib.left || lb.right > ib.right) {
      inner.scrollTo({ left: inner.scrollLeft + lb.left - ib.left - 24, behavior: reduceMotion ? "auto" : "smooth" });
    }
  }

  // Résumé: the toggle is a plain link to /resume/ until this takes over.
  const toggle = root.querySelector("[data-resume-toggle]");
  const panel = toggle && document.getElementById(toggle.getAttribute("aria-controls"));
  if (toggle && panel) {
    toggle.setAttribute("role", "button");
    Array.from(panel.querySelector(".work-resume__sheet").children).forEach((el, i) =>
      el.style.setProperty("--i", Math.min(i, 30))
    );
    if (!reduceMotion) panel.classList.add("work-resume--animate");
    let closeTimer = null;

    function setOpen(open) {
      toggle.setAttribute("aria-expanded", String(open));
      clearTimeout(closeTimer);
      if (open) {
        panel.hidden = false;
        void panel.offsetHeight; // start the unfold from the closed state
        panel.classList.add("is-open");
      } else {
        panel.classList.remove("is-open");
        closeTimer = setTimeout(() => (panel.hidden = true), reduceMotion ? 0 : 500);
      }
    }

    toggle.addEventListener("click", (e) => {
      e.preventDefault();
      setOpen(toggle.getAttribute("aria-expanded") !== "true");
    });
    toggle.addEventListener("keydown", (e) => {
      if (e.key === " ") {
        e.preventDefault();
        toggle.click();
      }
    });
    panel.addEventListener("transitionend", onScroll);
    if (location.hash === "#resume") setOpen(true);
  }

  // Sticky case label in the margin.
  const sticky = timeline && timeline.querySelector(".work-tl__sticky");
  const fill = timeline && timeline.querySelector(".work-tl__fill");
  const label = sticky && {
    n: sticky.querySelector(".work-rail__n"),
    org: sticky.querySelector(".work-rail__org"),
    years: sticky.querySelector(".work-rail__years"),
  };
  let current = 0;
  let swapTimer = null;

  function showCase(index) {
    if (!sticky || index === current) return;
    current = index;
    const d = cases[index].dataset;
    clearTimeout(swapTimer);
    sticky.style.opacity = reduceMotion ? 1 : 0;
    swapTimer = setTimeout(
      () => {
        label.n.textContent = d.n;
        label.org.textContent = d.org;
        label.years.textContent = d.years;
        sticky.style.opacity = 1;
      },
      reduceMotion ? 0 : 180
    );
  }

  let ticking = false;
  function update() {
    ticking = false;
    const doc = document.documentElement;
    const max = doc.scrollHeight - window.innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? window.scrollY / max : 0})`;
    unfurl();
    markBar();

    if (!timeline) return;
    const probe = window.innerHeight * 0.4; // matches .work-tl__sticky top
    const box = timeline.getBoundingClientRect();
    if (fill) fill.style.height = `${Math.max(0, Math.min(box.height, probe - box.top))}px`;

    let active = 0;
    cases.forEach((c, i) => {
      const on = probe > c.getBoundingClientRect().top + 30;
      c.classList.toggle("is-on", on);
      if (on) active = i;
    });
    showCase(active);
  }

  function onScroll() {
    if (!ticking) {
      ticking = true;
      requestAnimationFrame(update);
    }
  }

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", onScroll);
  update();
})();
