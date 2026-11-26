// Work portfolio motion: section reveals, line-by-line unfurl, reading
// progress, and the margin spine (fill line, case dots, sticky case label).
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
    el.style.setProperty("--d", `${Math.min(batch, 6) * 0.09}s`);
    batch += 1;
    clearTimeout(batchTimer);
    batchTimer = setTimeout(() => (batch = 0), 120);
    el.classList.add("is-in");
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
      { threshold: 0.15 }
    );
    sections.forEach((s) => io.observe(s));
  }

  function unfurl() {
    if (!pending.length) return;
    const line = window.innerHeight * 0.92;
    pending = pending.filter((el) => {
      if (el.getBoundingClientRect().top > line) return true;
      reveal(el);
      const impact = el.closest(".work-impact");
      if (impact) growImpact(impact);
      return false;
    });
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
        closeTimer = setTimeout(() => (panel.hidden = true), reduceMotion ? 0 : 900);
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
