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

      var onTransitionEnd = function (event) {
        if (event.propertyName !== 'height') {
          return;
        }

        content.removeEventListener('transitionend', onTransitionEnd);

        if (detail.classList.contains('closing')) {
          detail.open = false;
          detail.classList.remove('closing');
          content.style.height = '';
        } else {
          content.style.height = 'auto';
        }

        detail.removeAttribute('data-animating');
        updateAriaExpanded(detail.open);
      };

      var open = function () {
        detail.setAttribute('data-animating', 'true');
        detail.classList.remove('closing');
        content.style.height = '0px';

        detail.open = true;
        updateAriaExpanded(true);

        requestAnimationFrame(function () {
          var fullHeight = content.scrollHeight;
          content.style.height = fullHeight + 'px';
        });

        content.addEventListener('transitionend', onTransitionEnd);
      };

      var close = function () {
        detail.setAttribute('data-animating', 'true');
        detail.classList.add('closing');

        var currentHeight = content.scrollHeight;
        content.style.height = currentHeight + 'px';

        requestAnimationFrame(function () {
          content.style.height = '0px';
        });

        content.addEventListener('transitionend', onTransitionEnd);
      };

      summary.addEventListener('click', function (event) {
        event.preventDefault();

        if (detail.getAttribute('data-animating') === 'true') {
          return;
        }

        if (detail.open) {
          close();
        } else {
          open();
        }
      });

      summary.addEventListener('keydown', function (event) {
        if (event.key === ' ' || event.key === 'Enter') {
          event.preventDefault();
          summary.click();
        }
      });
    });
  });
})();
