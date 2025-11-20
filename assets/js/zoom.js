// Initialize medium zoom on every image rendered inside page/post content.
$(document).ready(function () {
  var selectorList = [
    ".post article img",
    ".post .post-content img",
    ".post figure img",
  ];

  var candidates = document.querySelectorAll(selectorList.join(","));

  candidates.forEach(function (img) {
    // Allow authors to opt-out by adding data-no-zoom to the image or any ancestor.
    if (img.hasAttribute("data-no-zoom")) {
      return;
    }
    if (img.closest("[data-no-zoom]")) {
      return;
    }
    if (!img.hasAttribute("data-zoomable")) {
      img.setAttribute("data-zoomable", "");
    }
  });

  medium_zoom = mediumZoom("[data-zoomable]", {
    background: getComputedStyle(document.documentElement).getPropertyValue("--global-bg-color") + "ee", // + 'ee' for transparency.
    margin: 24,
  });
});
