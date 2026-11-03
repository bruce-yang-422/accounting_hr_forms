/* Shared paginated lists, editors and pickers. Only the visible page creates record DOM. */
window.FavoritesUI = (() => {
  let serial = 0;
  const collator = new Intl.Collator('zh-TW', { numeric: true });
  function node(tag, className = '', text) {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function button(text, action, className = 'fm-button') {
    const element = node('button', className, text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }
  function createBrowser(host, config) {
    const prefix = `favorites-browser-${++serial}`;
    let entries = [], page = 1, size = config.pageSize || 20;
    const toolbar = node('div', 'fm-tools');
    const searchRow = node('div', 'fm-search-row');
    const searchLabel = node('label', 'flabel', config.searchLabel || '搜尋全部資料');
    const search = node('input', 'fi'); search.type = 'search'; search.id = `${prefix}-search`;
    search.placeholder = config.placeholder; searchLabel.htmlFor = search.id;
    const clear = button('清除搜尋與篩選', () => {
      search.value = ''; filters.forEach(filter => { filter.select.value = ''; }); page = 1; render(); search.focus();
    }, 'fm-button fm-clear');
    searchRow.append(searchLabel, search, clear); toolbar.append(searchRow);
    const filterRow = node('div', 'fm-filters');
    const filters = (config.filters || []).map((filter, index) => {
      const wrapper = node('div', 'fm-filter');
      const label = node('label', 'flabel', filter.label);
      const select = node('select', 'fi'); select.id = `${prefix}-filter-${index}`; label.htmlFor = select.id;
      wrapper.append(label, select); filterRow.append(wrapper);
      select.addEventListener('change', () => { page = 1; render(); });
      return { ...filter, select };
    });
    const sortWrap = node('div', 'fm-filter');
    const sortLabel = node('label', 'flabel', '排序');
    const sort = node('select', 'fi'); sort.id = `${prefix}-sort`; sortLabel.htmlFor = sort.id;
    sort.add(new Option(config.defaultSortLabel || '依名稱排序', 'asc')); sort.add(new Option('名稱反向排序', 'desc'));
    sortWrap.append(sortLabel, sort); filterRow.append(sortWrap); toolbar.append(filterRow);
    const summaryRow = node('div', 'fm-summary-row');
    const summary = node('p', 'fm-summary'); summary.setAttribute('role', 'status');
    const sizeLabel = node('label', 'fm-size', '每頁 ');
    const sizeSelect = node('select', 'fi'); sizeSelect.setAttribute('aria-label', '每頁顯示筆數');
    [20, 50].forEach(value => sizeSelect.add(new Option(`${value} 筆`, String(value)))); sizeSelect.value = String(size);
    sizeLabel.append(sizeSelect); summaryRow.append(summary, sizeLabel);
    const list = node('div', 'fm-list');
    const topPager = node('nav', 'fm-pagination'); topPager.setAttribute('aria-label', '上方分頁');
    const bottomPager = node('nav', 'fm-pagination'); bottomPager.setAttribute('aria-label', '下方分頁');
    const pagers = [topPager, bottomPager].map(pager => {
      const prev = button('上一頁', () => changePage(page - 1));
      const label = node('span', 'fm-page-number');
      const next = button('下一頁', () => changePage(page + 1));
      pager.append(prev, label, next); return { prev, next, label };
    });
    host.replaceChildren(toolbar, summaryRow, topPager, list, bottomPager);
    function changePage(value) { page = value; render(); host.scrollIntoView({ block: 'start' }); }
    function render() {
      const query = search.value.trim().toLocaleLowerCase();
      const active = Boolean(query || filters.some(filter => filter.select.value));
      clear.hidden = !active;
      const filtered = entries.filter(entry => (!query || query.split(/\s+/).every(word => entry.search.includes(word))) &&
        filters.every(filter => !filter.select.value || filter.value(entry.record) === filter.select.value));
      filtered.sort((a, b) => {
        if (sort.value === 'asc' && config.priority) {
          const difference = config.priority(b.record) - config.priority(a.record);
          if (difference) return difference;
        }
        return collator.compare(config.name(a.record), config.name(b.record)) * (sort.value === 'desc' ? -1 : 1);
      });
      const pages = Math.max(1, Math.ceil(filtered.length / size));
      page = Math.min(Math.max(1, page), pages);
      const start = (page - 1) * size;
      summary.textContent = filtered.length ? `${active ? `找到 ${filtered.length} 筆，共 ${entries.length} 筆` : `共 ${entries.length} 筆`} · 顯示 ${start + 1}–${Math.min(start + size, filtered.length)} 筆` : entries.length ? `找不到符合的資料，共 ${entries.length} 筆` : '目前沒有資料';
      list.replaceChildren();
      if (!filtered.length) {
        const empty = node('div', 'fm-empty');
        empty.append(node('strong', '', entries.length ? '沒有符合的資料' : config.emptyTitle || '尚未新增常用資料'),
          node('p', '', entries.length ? '換個關鍵字，或清除篩選後再找找。' : config.emptyText || '按「新增」建立第一筆資料。'));
        if (entries.length) empty.append(button('清除搜尋與篩選', () => clear.click()));
        else if (config.onCreate) empty.append(button(config.createLabel || '新增資料', config.onCreate, 'fm-button fm-primary'));
        list.append(empty);
      } else {
        const fragment = document.createDocumentFragment();
        filtered.slice(start, start + size).forEach(entry => fragment.append(config.renderItem(entry.record)));
        list.append(fragment);
      }
      pagers.forEach(pager => { pager.prev.disabled = page === 1; pager.next.disabled = page === pages; pager.label.textContent = `${page} / ${pages} 頁`; });
      topPager.hidden = bottomPager.hidden = filtered.length <= size;
      config.onCount?.(entries.length);
    }
    search.addEventListener('input', () => { page = 1; render(); });
    sort.addEventListener('change', () => { page = 1; render(); });
    sizeSelect.addEventListener('change', () => { size = Number(sizeSelect.value); page = 1; render(); });
    return {
      setRecords(records) {
        entries = records.map(record => ({ record, search: config.searchText(record).toLocaleLowerCase() }));
        filters.forEach(filter => {
          const previous = filter.select.value;
          filter.select.replaceChildren(new Option(`全部${filter.label}`, ''));
          const options = filter.options || [...new Set(records.map(filter.value).filter(Boolean))].sort(collator.compare).map(value => [value, value]);
          options.forEach(([value, label]) => filter.select.add(new Option(label, value)));
          filter.select.value = options.some(([value]) => value === previous) ? previous : '';
        });
        render();
      },
      reveal(record) {
        search.value = config.name(record); filters.forEach(filter => { filter.select.value = ''; }); page = 1; render();
      },
      focusSearch() { search.focus(); },
    };
  }
  function modal(titleText) {
    const dialog = node('dialog', 'fm-dialog');
    const header = node('div', 'fm-dialog-header');
    const title = node('h2', '', titleText); title.id = `favorites-dialog-${++serial}`;
    dialog.setAttribute('aria-labelledby', title.id);
    const closeButton = button('關閉', () => requestClose());
    const body = node('div', 'fm-dialog-body');
    const guard = node('div', 'fm-discard'); guard.hidden = true;
    let previousFocus;
    guard.append(node('p', '', '內容尚未儲存，要放棄這次變更嗎？'), button('繼續編輯', () => { guard.hidden = true; previousFocus?.focus(); }),
      button('放棄變更並關閉', () => dialog.close(), 'fm-button fm-danger'));
    header.append(title, closeButton); dialog.append(header, guard, body); document.body.append(dialog);
    let isDirty = () => false;
    function requestClose() {
      if (isDirty()) {
        previousFocus = document.activeElement;
        guard.hidden = false;
        guard.querySelector('button').focus();
      } else dialog.close();
    }
    dialog.addEventListener('cancel', event => { event.preventDefault(); requestClose(); });
    dialog.addEventListener('close', () => { document.documentElement.classList.remove('favorites-modal-open'); guard.hidden = true; });
    return { dialog, body, title, requestClose, setDirty(check) { isDirty = check; },
      open(titleText) { if (titleText) title.textContent = titleText; guard.hidden = true; dialog.showModal(); document.documentElement.classList.add('favorites-modal-open'); },
      close() { dialog.close(); },
    };
  }
  function editor(form, titleText) {
    const view = modal(titleText); view.body.append(form);
    let snapshot = '';
    const collect = () => JSON.stringify([...form.querySelectorAll('input, select, textarea')].map(field => [field.id, field.value]));
    view.setDirty(() => collect() !== snapshot);
    return { ...view, open(title) { snapshot = collect(); view.open(title); form.querySelector('input')?.focus(); } };
  }
  function picker(config) {
    const view = modal(config.title);
    const intro = node('p', 'fm-intro', '輸入關鍵字搜尋，按「帶入」即可填入表單。');
    const host = node('div');
    const status = node('p', 'fm-status'); status.setAttribute('role', 'status');
    const manage = node('a', 'favorites-backup-link', '管理常用資料（另開分頁）'); manage.href = config.manageUrl;
    manage.target = '_blank'; manage.rel = 'noopener';
    view.body.append(intro, host, status, manage);
    const browser = createBrowser(host, { ...config, renderItem(record) {
      const card = node('article', 'fm-record');
      const info = node('div', 'fm-record-info');
      info.append(node('h3', '', config.name(record)), node('p', '', config.description(record)));
      card.append(info, button('帶入', () => {
        try { config.onSelect(record); view.close(); } catch (error) { status.textContent = error.message; }
      }, 'fm-button fm-primary'));
      return card;
    } });
    return { open() {
      status.textContent = '';
      try { browser.setRecords(config.load()); } catch (error) { status.textContent = `無法讀取資料：${error.message}`; browser.setRecords([]); }
      view.open(); browser.focusSearch();
    }, refresh() { if (view.dialog.open) { try { browser.setRecords(config.load()); } catch (error) { status.textContent = error.message; } } } };
  }
  return { node, button, createBrowser, editor, picker };
})();
