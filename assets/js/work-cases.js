(function () {
  document.addEventListener('DOMContentLoaded', function () {
    var detailsList = document.querySelectorAll('details.work-case');
    if (!detailsList.length) {
      return;
    }

    var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    detailsList.forEach(function (detail, index) {
      var summary = detail.querySelector('summary');
      var content = detail.querySelector('.work-case__content');

      if (!summary || !content) {
        return;
      }

      if (!content.id) {
        content.id = 'work-case-content-' + (index + 1);
      }
      summary.setAttribute('aria-controls', content.id);

      if (detail.open) {
        content.style.height = 'auto';
        content.style.opacity = '1';
      }

      var updateAriaExpanded = function (expanded) {
        summary.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      };
      updateAriaExpanded(detail.open);

      if (reduceMotion) {
        detail.addEventListener('toggle', function () {
          updateAriaExpanded(detail.open);
          if (detail.open) {
            content.style.height = 'auto';
          } else {
            content.style.height = '';
          }
        });
        return;
      }

      var fallbackTimer = null;
      var animationDuration = 700;

      var clearFallback = function () {
        if (fallbackTimer !== null) {
          window.clearTimeout(fallbackTimer);
          fallbackTimer = null;
        }
      };

      var finishAnimation = function (shouldRemainOpen) {
        clearFallback();
        content.removeEventListener('transitionend', onTransitionEnd);
        content.removeEventListener('transitioncancel', onTransitionEnd);
        detail.removeAttribute('data-animating');

        if (shouldRemainOpen) {
          detail.classList.remove('closing');
          content.style.height = 'auto';
          updateAriaExpanded(true);
          return;
        }

        detail.classList.remove('closing');
        detail.open = false;
        content.style.height = '';
        updateAriaExpanded(false);
      };

      var onTransitionEnd = function (event) {
        if (event.target !== content || event.propertyName !== 'height') {
          return;
        }

        finishAnimation(!detail.classList.contains('closing'));
      };

      var scheduleFallback = function () {
        clearFallback();
        var timeout = reduceMotion ? 50 : animationDuration + 400;
        fallbackTimer = window.setTimeout(function () {
          if (detail.getAttribute('data-animating') === 'true') {
            finishAnimation(!detail.classList.contains('closing'));
          }
        }, timeout);
      };

      var open = function () {
        detail.setAttribute('data-animating', 'true');
        detail.classList.remove('closing');
        content.style.height = '0px';
        content.getBoundingClientRect();

        detail.open = true;
        updateAriaExpanded(true);

        requestAnimationFrame(function () {
          var fullHeight = content.scrollHeight;
          content.style.height = fullHeight + 'px';
        });

        content.addEventListener('transitionend', onTransitionEnd);
        content.addEventListener('transitioncancel', onTransitionEnd);
        scheduleFallback();
      };

      var close = function () {
        detail.setAttribute('data-animating', 'true');
        detail.classList.add('closing');

        var currentHeight = content.scrollHeight;
        content.style.height = currentHeight + 'px';
        content.getBoundingClientRect();

        requestAnimationFrame(function () {
          content.style.height = '0px';
        });

        content.addEventListener('transitionend', onTransitionEnd);
        content.addEventListener('transitioncancel', onTransitionEnd);
        scheduleFallback();
      };

      var handleSummaryClick = function (event) {
        event.preventDefault();
        event.stopPropagation();

        if (detail.getAttribute('data-animating') === 'true') {
          finishAnimation(!detail.classList.contains('closing'));
        }

        if (detail.open) {
          close();
        } else {
          open();
        }
      };

      summary.addEventListener('click', handleSummaryClick, {
        capture: true,
        passive: false,
      });

      summary.addEventListener('keydown', function (event) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          handleSummaryClick(event);
        }
      });
    });
  });
})();
