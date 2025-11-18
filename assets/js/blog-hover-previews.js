(function () {
  const data = Array.isArray(window.__blogPreviewData) ? window.__blogPreviewData : [];
  if (!data.length) {
    return;
  }

  const normalize = (href) => {
    try {
      const url = new URL(href, window.location.origin);
      let path = url.pathname;
      if (!path.endsWith('/')) {
        path += '/';
      }
      return path;
    } catch (err) {
      return href;
    }
  };

  const previewMap = new Map();
  data.forEach((entry) => {
    if (!entry || !entry.url) {
      return;
    }
    const normalized = normalize(entry.url);
    previewMap.set(normalized, entry);
  });

  if (!previewMap.size) {
    return;
  }

  const anchors = document.querySelectorAll('.post-content a[href]');
  if (!anchors.length) {
    return;
  }

  const card = document.createElement('div');
  card.className = 'post-hover-preview post-hover-preview--floating';
  card.innerHTML = `
    <img class="post-hover-preview__image" alt="">
    <p class="post-hover-preview__summary"></p>
  `;
  document.body.appendChild(card);

  const cardImage = card.querySelector('.post-hover-preview__image');
  const cardSummary = card.querySelector('.post-hover-preview__summary');

  let activeAnchor = null;

  const hideCard = (anchor) => {
    if (anchor && anchor !== activeAnchor) {
      return;
    }
    activeAnchor = null;
    card.classList.remove('is-visible');
  };

  const positionCard = (anchor) => {
    if (!activeAnchor) {
      return;
    }
    const rect = anchor.getBoundingClientRect();
    const cardRect = card.getBoundingClientRect();
    const scrollX = window.scrollX || window.pageXOffset;
    const scrollY = window.scrollY || window.pageYOffset;

    let left = rect.right + scrollX + 16;
    const viewportWidth = document.documentElement.clientWidth;
    if (left + cardRect.width > scrollX + viewportWidth - 12) {
      left = rect.left + scrollX - cardRect.width - 16;
    }

    let top = rect.top + scrollY + rect.height / 2 - cardRect.height / 2;
    const minTop = scrollY + 12;
    const maxTop = scrollY + window.innerHeight - cardRect.height - 12;
    top = Math.max(minTop, Math.min(maxTop, top));

    card.style.left = `${left}px`;
    card.style.top = `${top}px`;
  };

  const showCard = (anchor, entry) => {
    if (!entry) {
      return;
    }
    activeAnchor = anchor;
    if (entry.image) {
      cardImage.src = entry.image;
      cardImage.style.display = '';
    } else {
      cardImage.removeAttribute('src');
      cardImage.style.display = 'none';
    }
    cardSummary.textContent = entry.summary || entry.title || '';
    card.classList.add('is-visible');
    positionCard(anchor);
  };

  const getEntry = (href) => {
    if (!href) {
      return null;
    }
    const normalized = normalize(href);
    if (previewMap.has(normalized)) {
      return previewMap.get(normalized);
    }
    // Also try removing trailing slash in case the stored path doesn't have it.
    if (normalized.endsWith('/')) {
      const trimmed = normalized.slice(0, -1);
      if (previewMap.has(trimmed)) {
        return previewMap.get(trimmed);
      }
    }
    return null;
  };

  anchors.forEach((anchor) => {
    const handleEnter = () => {
      const entry = getEntry(anchor.href || anchor.getAttribute('href'));
      if (!entry) {
        return;
      }
      showCard(anchor, entry);
    };
    anchor.addEventListener('mouseenter', handleEnter);
    anchor.addEventListener('focus', handleEnter);
    const handleLeave = () => hideCard(anchor);
    anchor.addEventListener('mouseleave', handleLeave);
    anchor.addEventListener('blur', handleLeave);
  });

  window.addEventListener('scroll', () => hideCard());
  window.addEventListener('resize', () => {
    if (activeAnchor) {
      positionCard(activeAnchor);
    }
  });
})();
