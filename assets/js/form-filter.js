(() => {
  const filters = document.getElementById('formFilters');
  const grid = document.getElementById('formGrid');
  const status = document.getElementById('formFilterStatus');
  if (!filters || !grid || !status) return;

  const cards = [...grid.querySelectorAll('.form-card')];
  const forms = cards.filter(card => card.dataset.category);
  const buttons = [...filters.querySelectorAll('button[data-category]')];
  const matches = (card, category) => category === 'all' || card.dataset.category === category;

  buttons.forEach(button => {
    const category = button.dataset.category;
    const count = forms.filter(card => matches(card, category)).length;
    button.querySelector('.form-filter-count').textContent = String(count);
    button.addEventListener('click', () => {
      cards.forEach(card => { card.hidden = !matches(card, category); });
      buttons.forEach(option => { option.setAttribute('aria-pressed', String(option === button)); });
      status.textContent = `顯示 ${count} 種表單，共 ${forms.length} 種`;
    });
  });

  status.textContent = `顯示 ${forms.length} 種表單，共 ${forms.length} 種`;
  filters.hidden = false;
})();
