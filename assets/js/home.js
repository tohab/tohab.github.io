// Home page motion: each section fades up as it scrolls into view.
// Content stays visible without JavaScript or when reduced motion is preferred.
(function () {
  const root = document.querySelector("[data-home]");
  if (!root) return;

  const sections = root.querySelectorAll(".home-sect");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  if (reduceMotion || !("IntersectionObserver" in window)) {
    sections.forEach((s) => s.classList.add("is-in"));
    return;
  }

  root.classList.add("home--animate");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 }
  );
  sections.forEach((s) => io.observe(s));
})();
