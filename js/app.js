(() => {
  'use strict';

  // ---- State ----
  let topics = [];
  let activeCategory = 'all';
  let searchQuery = '';
  let sortMode = 'date';

  // ---- DOM refs ----
  const $grid = document.getElementById('cardGrid');
  const $categoryList = document.getElementById('categoryList');
  const $searchInput = document.getElementById('searchInput');
  const $topicCount = document.querySelector('.header__count-num');
  const $currentCategory = document.getElementById('currentCategory');
  const $emptyState = document.getElementById('emptyState');
  const $menuToggle = document.getElementById('menuToggle');
  const $sidebar = document.getElementById('sidebar');
  const $overlay = document.getElementById('sidebarOverlay');
  const $sortBtns = document.querySelectorAll('.main__sort-btn');

  // Modal refs
  const $modal = document.getElementById('modal');
  const $modalBackdrop = document.getElementById('modalBackdrop');
  const $modalClose = document.getElementById('modalClose');
  const $modalImageWrap = document.getElementById('modalImageWrap');
  const $modalCategory = document.getElementById('modalCategory');
  const $modalTitle = document.getElementById('modalTitle');
  const $modalTags = document.getElementById('modalTags');
  const $modalBody = document.getElementById('modalBody');
  const $modalDate = document.getElementById('modalDate');

  // ---- Load data ----
  async function loadTopics() {
    try {
      const res = await fetch('content.json');
      topics = await res.json();
      init();
    } catch (e) {
      console.error('Failed to load content.json:', e);
      $grid.textContent = 'Failed to load topics.';
    }
  }

  // ---- Init ----
  function init() {
    renderCategories();
    renderCards();
  }

  // ---- Categories ----
  function getCategories() {
    const counts = {};
    topics.forEach(t => {
      counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }

  function createCategoryItem(name, count, isActive) {
    const li = document.createElement('li');
    li.className = 'sidebar__item';

    const a = document.createElement('a');
    a.className = 'sidebar__link' + (isActive ? ' active' : '');
    a.dataset.category = name;

    const nameSpan = document.createElement('span');
    nameSpan.className = 'sidebar__link-name';
    nameSpan.textContent = name === 'all' ? 'All' : name;

    const countSpan = document.createElement('span');
    countSpan.className = 'sidebar__link-count';
    countSpan.textContent = count;

    a.appendChild(nameSpan);
    a.appendChild(countSpan);

    a.addEventListener('click', () => {
      activeCategory = name;
      renderCategories();
      renderCards();
      closeMobileMenu();
    });

    li.appendChild(a);
    return li;
  }

  function renderCategories() {
    const cats = getCategories();
    const total = topics.length;

    $categoryList.replaceChildren();
    $categoryList.appendChild(createCategoryItem('all', total, activeCategory === 'all'));

    cats.forEach(([name, count]) => {
      $categoryList.appendChild(createCategoryItem(name, count, activeCategory === name));
    });
  }

  // ---- Filter & Sort ----
  function getFilteredTopics() {
    let filtered = topics;

    if (activeCategory !== 'all') {
      filtered = filtered.filter(t => t.category === activeCategory);
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.summary.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }

    if (sortMode === 'date') {
      filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
    } else {
      filtered.sort((a, b) => a.title.localeCompare(b.title, 'ja'));
    }

    return filtered;
  }

  // ---- Create card element ----
  function createCard(topic, index) {
    const article = document.createElement('article');
    article.className = 'card';
    article.style.animationDelay = (index * 0.05) + 's';

    // Image area
    const imageWrap = document.createElement('div');
    imageWrap.className = 'card__image-wrap';

    if (topic.image) {
      const img = document.createElement('img');
      img.className = 'card__image';
      img.alt = topic.title;
      img.loading = 'lazy';
      img.src = topic.image;
      img.addEventListener('error', () => {
        // On image load error, show placeholder
        const placeholder = document.createElement('div');
        placeholder.className = 'card__image-placeholder';
        placeholder.textContent = topic.title.charAt(0);
        imageWrap.replaceChildren(placeholder);
      });
      imageWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'card__image-placeholder';
      placeholder.textContent = topic.title.charAt(0);
      imageWrap.appendChild(placeholder);
    }

    // Body area
    const body = document.createElement('div');
    body.className = 'card__body';

    const cat = document.createElement('span');
    cat.className = 'card__category';
    cat.textContent = topic.category;

    const title = document.createElement('h3');
    title.className = 'card__title';
    title.textContent = topic.title;

    const summary = document.createElement('p');
    summary.className = 'card__summary';
    summary.textContent = topic.summary;

    const footer = document.createElement('div');
    footer.className = 'card__footer';

    const tagsDiv = document.createElement('div');
    tagsDiv.className = 'card__tags';
    topic.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'card__tag';
      tagSpan.textContent = tag;
      tagsDiv.appendChild(tagSpan);
    });

    const dateEl = document.createElement('time');
    dateEl.className = 'card__date';
    dateEl.textContent = formatDate(topic.date);

    footer.appendChild(tagsDiv);
    footer.appendChild(dateEl);

    body.appendChild(cat);
    body.appendChild(title);
    body.appendChild(summary);
    body.appendChild(footer);

    article.appendChild(imageWrap);
    article.appendChild(body);

    // Click to open modal
    article.addEventListener('click', () => openModal(topic));

    return article;
  }

  // ---- Render Cards ----
  function renderCards() {
    const filtered = getFilteredTopics();

    $topicCount.textContent = filtered.length;
    $currentCategory.textContent = activeCategory === 'all' ? 'All Topics' : activeCategory;

    if (filtered.length === 0) {
      $grid.replaceChildren();
      $emptyState.style.display = 'flex';
      return;
    }

    $emptyState.style.display = 'none';

    const fragment = document.createDocumentFragment();
    filtered.forEach((t, i) => {
      fragment.appendChild(createCard(t, i));
    });
    $grid.replaceChildren(fragment);
  }

  // ---- Modal ----
  function openModal(topic) {
    // Image
    $modalImageWrap.replaceChildren();
    if (topic.image) {
      const img = document.createElement('img');
      img.alt = topic.title;
      img.src = topic.image;
      img.addEventListener('error', () => {
        const placeholder = document.createElement('div');
        placeholder.className = 'modal__image-placeholder';
        placeholder.textContent = topic.title.charAt(0);
        $modalImageWrap.replaceChildren(placeholder);
      });
      $modalImageWrap.appendChild(img);
    } else {
      const placeholder = document.createElement('div');
      placeholder.className = 'modal__image-placeholder';
      placeholder.textContent = topic.title.charAt(0);
      $modalImageWrap.appendChild(placeholder);
    }

    // Content
    $modalCategory.textContent = topic.category;
    $modalTitle.textContent = topic.title;
    $modalBody.textContent = topic.body || topic.summary;
    $modalDate.textContent = formatDate(topic.date);

    // Tags
    $modalTags.replaceChildren();
    topic.tags.forEach(tag => {
      const tagSpan = document.createElement('span');
      tagSpan.className = 'modal__tag';
      tagSpan.textContent = tag;
      $modalTags.appendChild(tagSpan);
    });

    // Links
    const existingLinks = document.querySelector('.modal__links');
    if (existingLinks) existingLinks.remove();

    if (topic.links) {
      const linksDiv = document.createElement('div');
      linksDiv.className = 'modal__links';

      if (topic.links.speakerdeck) {
        const a = document.createElement('a');
        a.className = 'modal__link';
        a.href = topic.links.speakerdeck;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.textContent = 'Speaker Deck で見る';
        linksDiv.appendChild(a);
      }

      $modalBody.parentNode.insertBefore(linksDiv, $modalDate);
    }

    $modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  $modalClose.addEventListener('click', closeModal);
  $modalBackdrop.addEventListener('click', closeModal);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && $modal.classList.contains('open')) {
      closeModal();
    }
  });

  // ---- Format date ----
  function formatDate(dateStr) {
    const d = new Date(dateStr);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return y + '.' + m + '.' + day;
  }

  // ---- Search ----
  let searchTimeout;
  $searchInput.addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      searchQuery = e.target.value.trim();
      renderCards();
    }, 150);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === '/' && document.activeElement !== $searchInput && !$modal.classList.contains('open')) {
      e.preventDefault();
      $searchInput.focus();
    }
    if (e.key === 'Escape' && document.activeElement === $searchInput) {
      $searchInput.blur();
      $searchInput.value = '';
      searchQuery = '';
      renderCards();
    }
  });

  // ---- Sort ----
  $sortBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      $sortBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      sortMode = btn.dataset.sort;
      renderCards();
    });
  });

  // ---- Mobile menu ----
  function closeMobileMenu() {
    $sidebar.classList.remove('open');
    $overlay.classList.remove('visible');
    $menuToggle.classList.remove('active');
  }

  $menuToggle.addEventListener('click', () => {
    const isOpen = $sidebar.classList.toggle('open');
    $overlay.classList.toggle('visible', isOpen);
    $menuToggle.classList.toggle('active', isOpen);
  });

  $overlay.addEventListener('click', closeMobileMenu);

  // ---- Go ----
  loadTopics();
})();
