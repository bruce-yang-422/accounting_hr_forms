(() => {
  const filters = document.getElementById('formFilters');
  const grid = document.getElementById('formGrid');
  const status = document.getElementById('formFilterStatus');
  const favoriteButton = document.querySelector('[data-shortcut="favorites"]');
  const empty = document.getElementById('formFilterEmpty');
  if (!filters || !grid || !status) return;

  const cards = [...grid.querySelectorAll('.form-card')];
  const forms = cards.filter(card => card.dataset.category);
  const buttons = [...filters.querySelectorAll('button[data-category]')];
  const matches = (card, category) => category === 'all' || card.dataset.category === category;
  let category = 'all', favoritesOnly = false;

  function render() {
    let favorites = [], error = '';
    if (favoritesOnly) {
      try { favorites = FormShortcuts.favorites().map(type => `./${FormShortcuts.formOf(type).path}`); }
      catch (issue) { error = issue.message; }
    }
    const isFavorite = card => favorites.includes(card.querySelector('.fc-btn')?.getAttribute('href'));
    const available = forms.filter(card => !favoritesOnly || isFavorite(card));
    const count = available.filter(card => matches(card, category)).length;
    const focusedCard = document.activeElement?.closest('.form-card');
    cards.forEach(card => { card.hidden = !matches(card, category) || (favoritesOnly && !isFavorite(card)); });
    if (focusedCard?.hidden) favoriteButton?.focus();
    buttons.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.category === category));
      button.querySelector('.form-filter-count').textContent = String(available.filter(card => matches(card, button.dataset.category)).length);
    });
    favoriteButton?.setAttribute('aria-pressed', String(favoritesOnly));
    status.textContent = error || `顯示 ${count} 種${favoritesOnly ? '收藏' : ''}表單，共 ${forms.length} 種`;
    grid.hidden = count === 0;
    if (empty) {
      empty.hidden = count !== 0;
      document.getElementById('formFilterEmptyMessage').textContent = error || (favorites.length ? '此分類沒有收藏的表單，可切換分類或清除篩選。' : '尚未收藏表單，清除篩選後可按表單標題旁的星號加入收藏。');
    }
  }
  buttons.forEach(button => button.addEventListener('click', () => { category = button.dataset.category; render(); }));
  favoriteButton?.addEventListener('click', () => { favoritesOnly = !favoritesOnly; render(); });
  document.getElementById('clearFormFilters')?.addEventListener('click', () => { category = 'all'; favoritesOnly = false; render(); favoriteButton?.focus(); });
  window.addEventListener('form-favorites-changed', render);
  render(); filters.hidden = false;
})();
