// Home page motion.
//
// The story: this page is my notebook. The name is set like a proof and
// underlined by hand, and each section gets a note in the margin, written in
// with its arrow sketched as the section arrives. (/work is the typeset,
// ruled counterpart.)
//
// Sections fade up as they scroll into view; the notes and pen strokes are
// CSS transitions keyed off the same .is-in class. Everything is visible
// without JavaScript or with reduced motion.
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
