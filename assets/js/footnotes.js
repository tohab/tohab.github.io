(function () {
  function initFootnotes() {
    var footnotesRoot = document.querySelector('.footnotes');
    if (!footnotesRoot) return;

    var noteMap = new Map();
    footnotesRoot.querySelectorAll('ol > li[id^="fn"]').forEach(function (item) {
      var noteId = item.id.replace(/^fn:/, '');
      if (!noteId) return;
      var clone = item.cloneNode(true);
      clone.querySelectorAll('a.reversefootnote').forEach(function (reverseLink) {
        reverseLink.remove();
      });
      noteMap.set(noteId, clone.innerHTML.trim());
    });

    if (!noteMap.size) return;

    var references = document.querySelectorAll('a.footnote');
    if (!references.length) return;

    var openRef = null;

    function closeRef(ref) {
      if (!ref) return;
      ref.classList.remove('is-open');
      var button = ref.querySelector('.footnote-ref__button');
      if (button) {
        button.setAttribute('aria-expanded', 'false');
      }
      if (openRef === ref) {
        openRef = null;
      }
    }

    function toggleRef(ref) {
      if (!ref) return;
      if (openRef && openRef !== ref) {
        closeRef(openRef);
      }
      var willOpen = !ref.classList.contains('is-open');
      if (willOpen) {
        ref.classList.add('is-open');
        var btn = ref.querySelector('.footnote-ref__button');
        if (btn) {
          btn.setAttribute('aria-expanded', 'true');
        }
        openRef = ref;
      } else {
        closeRef(ref);
      }
    }

    references.forEach(function (link, index) {
      var sup = link.closest('sup');
      var href = link.getAttribute('href') || '';
      var targetId = href.replace('#fn:', '');
      var content = noteMap.get(targetId);
      if (!sup || !targetId || !content) return;

      var wrapper = document.createElement('span');
      wrapper.className = 'footnote-ref';
      wrapper.dataset.footnoteTarget = targetId;

      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'footnote-ref__button';
      button.innerHTML = link.innerHTML;
      button.setAttribute('aria-expanded', 'false');
      button.setAttribute(
        'aria-label',
        'Toggle footnote ' + (link.textContent || '').trim()
      );

      var bubble = document.createElement('div');
      bubble.className = 'footnote-ref__bubble';
      bubble.setAttribute('role', 'tooltip');
      bubble.setAttribute('tabindex', '-1');
      var bubbleId = 'footnote-bubble-' + targetId + '-' + index;
      bubble.id = bubbleId;
      button.setAttribute('aria-describedby', bubbleId);
      bubble.innerHTML = content;

      button.addEventListener('click', function (event) {
        event.preventDefault();
        toggleRef(wrapper);
        if (wrapper.classList.contains('is-open')) {
          bubble.focus();
        }
      });

      sup.innerHTML = '';
      wrapper.appendChild(button);
      wrapper.appendChild(bubble);
      sup.appendChild(wrapper);
    });

    document.addEventListener('click', function (event) {
      if (event.target.closest('.footnote-ref')) return;
      closeRef(openRef);
    });

    document.addEventListener('keyup', function (event) {
      if (event.key === 'Escape') {
        closeRef(openRef);
      }
    });

    footnotesRoot.classList.add('footnotes--visually-hidden');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFootnotes);
  } else {
    initFootnotes();
  }
})();
