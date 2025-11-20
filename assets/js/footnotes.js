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

    var openRefs = [];
    var refCounter = 0;

    function removeOpenRef(ref) {
      openRefs = openRefs.filter(function (item) {
        return item !== ref;
      });
    }

    function closeRef(ref) {
      if (!ref || !ref.classList.contains('is-open')) return;

      openRefs.slice().forEach(function (openRef) {
        if (openRef !== ref && ref.contains(openRef)) {
          closeRef(openRef);
        }
      });

      ref.classList.remove('is-open');
      var button = ref.querySelector('.footnote-ref__button');
      if (button) {
        button.setAttribute('aria-expanded', 'false');
      }
      removeOpenRef(ref);
    }

    function closeAllRefs() {
      openRefs.slice().forEach(function (ref) {
        closeRef(ref);
      });
    }

    function toggleRef(ref) {
      if (!ref) return;
      var willOpen = !ref.classList.contains('is-open');
      if (willOpen) {
        var hasAncestorOpen = openRefs.some(function (openRef) {
          return openRef.contains(ref);
        });
        if (!hasAncestorOpen) {
          closeAllRefs();
        }
        ref.classList.add('is-open');
        var btn = ref.querySelector('.footnote-ref__button');
        if (btn) {
          btn.setAttribute('aria-expanded', 'true');
        }
        openRefs.push(ref);
      } else {
        closeRef(ref);
      }
    }

    function enhanceReferences(root) {
      var links = root.querySelectorAll('a.footnote');
      links.forEach(function (link) {
        if (footnotesRoot.contains(link)) return;
        var sup = link.closest('sup');
        if (!sup || sup.classList.contains('footnote-ref')) return;
        var href = link.getAttribute('href') || '';
        var targetId = href.replace('#fn:', '');
        var content = noteMap.get(targetId);
        if (!targetId || !content) return;

        sup.classList.add('footnote-ref');
        sup.dataset.footnoteTarget = targetId;

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
        var bubbleId = 'footnote-bubble-' + targetId + '-' + refCounter++;
        bubble.id = bubbleId;
        button.setAttribute('aria-describedby', bubbleId);
        bubble.innerHTML = content;

        button.addEventListener('click', function (event) {
          event.preventDefault();
          toggleRef(sup);
          if (sup.classList.contains('is-open')) {
            bubble.focus();
          }
        });

        sup.innerHTML = '';
        sup.appendChild(button);
        sup.appendChild(bubble);

        enhanceReferences(bubble);
      });
    }

    enhanceReferences(document);

    document.addEventListener('click', function (event) {
      if (event.target.closest('sup.footnote-ref')) return;
      closeAllRefs();
    });

    document.addEventListener('keyup', function (event) {
      if (event.key === 'Escape') {
        closeAllRefs();
      }
    });

    footnotesRoot.remove();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFootnotes);
  } else {
    initFootnotes();
  }
})();
