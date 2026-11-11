(() => {
  const shortcuts = document.getElementById('formShortcuts');
  if (!shortcuts) return;
  const { FORMS, formOf } = FormShortcuts;
  const node = (tag, className, content) => {
    const element = document.createElement(tag); element.className = className;
    if (content) element.textContent = content;
    return element;
  };
  const icon = name => {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ui-icon'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
    const path = document.createElementNS(svg.namespaceURI, 'path');
    path.setAttribute('d', name === 'star' ? 'm12 3 2.78 5.63L21 9.54l-4.5 4.39L17.56 20 12 17.08 6.44 20l1.06-6.07L3 9.54l6.22-.91Z' :
      name === 'close' ? 'm6 6 12 12M18 6 6 18' : 'm9 5 7 7-7 7');
    svg.append(path); return svg;
  };
  const date = value => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false }) : '時間未記錄';
  const time = value => Number.isFinite(Date.parse(value)) ? Date.parse(value) : 0;
  const titles = { recent: '最近使用', drafts: '未完成草稿' };
  const emptyMessages = { recent: '還沒有使用紀錄，開啟表單後會自動出現在這裡。', drafts: '目前沒有已儲存的草稿。填寫表單時按「儲存草稿」，即可從這裡繼續。' };
  const favoriteButtons = new Map();
  let active = 'recent';
  let opener;
  const panel = node('section', 'shortcut-panel'); panel.id = 'shortcutPanel'; panel.hidden = true;
  panel.setAttribute('aria-labelledby', 'shortcutTitle');
  const header = node('div', 'shortcut-panel-head');
  const heading = node('h2', '', ''); heading.id = 'shortcutTitle'; heading.tabIndex = -1;
  const close = node('button', 'shortcut-action shortcut-close'); close.type = 'button';
  close.setAttribute('aria-label', '收合快捷清單'); close.title = '收合清單（Esc）'; close.append(icon('close'));
  close.addEventListener('click', () => collapse(true)); header.append(heading, close);
  const message = node('p', 'shortcut-message'); message.setAttribute('role', 'status');
  const list = node('div', 'shortcut-list');
  panel.append(header, message, list); shortcuts.after(panel);

  function collapse(focus) {
    panel.hidden = true;
    shortcuts.querySelectorAll('[data-shortcut]:not([data-shortcut="favorites"])').forEach(button => button.setAttribute('aria-expanded', 'false'));
    if (focus) opener?.focus();
  }

  function drafts() {
    const records = [], errors = [];
    FORMS.forEach(form => {
      try { FormRecentRecords.loadDrafts(form.type).forEach(record => records.push({ form, record })); }
      catch { errors.push(form.label); }
    });
    records.sort((a, b) => time(b.record.updatedAt) - time(a.record.updatedAt));
    return { records, errors };
  }
  function refresh() {
    try {
      const favorites = FormShortcuts.favorites();
      favoriteButtons.forEach((button, type) => {
        const saved = favorites.includes(type);
        button.setAttribute('aria-pressed', String(saved));
        button.setAttribute('aria-label', `${saved ? '取消收藏' : '收藏'}${formOf(type).label}`);
        button.title = `${saved ? '取消收藏' : '收藏'}${formOf(type).label}`;
      });
      document.getElementById('shortcutFavoritesCount').textContent = `${favorites.length} 種`;
    } catch { document.getElementById('shortcutFavoritesCount').textContent = '無法讀取'; }
    try { document.getElementById('shortcutRecentCount').textContent = `${FormShortcuts.recent().length} 種`; }
    catch { document.getElementById('shortcutRecentCount').textContent = '無法讀取'; }
    const saved = drafts();
    document.getElementById('shortcutDraftsCount').textContent = `${saved.records.length} 筆${saved.errors.length ? '・部分無法讀取' : ''}`;
    window.dispatchEvent(new Event('form-favorites-changed'));
  }
  function toggle(type) {
    try {
      FormShortcuts.toggleFavorite(type); refresh();
      const status = document.getElementById('shortcutStatus'); delete status.dataset.error;
      status.textContent = `${formOf(type).label}${FormShortcuts.favorites().includes(type) ? '已加入收藏' : '已取消收藏'}`;

    } catch (error) {
      if (!panel.hidden) message.textContent = `未能更新收藏：${error.message}`;
      else {
        const status = document.getElementById('shortcutStatus'); status.dataset.error = 'true';
        status.textContent = `未能更新收藏：${error.message}`;
      }
    }
  }
  function render() {
    panel.dataset.view = active;
    heading.textContent = titles[active]; message.textContent = ''; list.replaceChildren();
    try {
      let entries;
      if (active === 'drafts') {
        const saved = drafts(); entries = saved.records;
        if (saved.errors.length) message.textContent = `以下表單的草稿無法讀取：${saved.errors.join('、')}。其他草稿仍可開啟。`;
      } else entries = FormShortcuts.recent().map(record => ({ form: formOf(record.type), usedAt: record.usedAt }));
      if (!entries.length) list.append(node('p', 'shortcut-empty', emptyMessages[active]));
      entries.forEach(({ form, record, usedAt }) => {
        const row = node('article', 'shortcut-row');
        const info = node('div', 'shortcut-info');
        info.append(node('h3', '', record ? record.title : form.label));
        if (record || usedAt) info.append(node('p', '', record ? `${form.label} · 更新 ${date(record.updatedAt)}` : `最近開啟 ${date(usedAt)}`));
        const link = node('a', 'shortcut-row-link');
        link.href = `./${form.path}${record ? `?draft=${encodeURIComponent(record.id)}` : ''}`;
        link.setAttribute('aria-label', `${record ? '繼續填寫' : '開啟'}${form.label}${record ? `：${record.title}` : ''}`);
        link.title = `${record ? '繼續填寫' : '開啟'}${form.label}`;
        const actionHint = node('span', 'shortcut-link-hint', record ? '繼續填寫' : '開啟');
        actionHint.append(icon('open')); link.append(info, actionHint);
        row.append(link); list.append(row);
      });
    } catch (error) { message.textContent = error.message; }
  }
  FORMS.forEach(form => {
    const card = document.querySelector(`#formGrid a[href="./${form.path}"]`)?.closest('.form-card');
    if (!card) return;
    const favorite = node('button', 'form-favorite'); favorite.type = 'button'; favorite.append(icon('star'));
    favorite.setAttribute('aria-pressed', 'false'); favorite.addEventListener('click', () => toggle(form.type));
    card.querySelector('.fc-head').append(favorite); favoriteButtons.set(form.type, favorite);
  });
  shortcuts.querySelectorAll('[data-shortcut]').forEach(button => {
    button.removeAttribute('aria-haspopup');
    if (button.dataset.shortcut === 'favorites') {
      button.removeAttribute('aria-expanded'); button.setAttribute('aria-controls', 'formGrid');
      button.title = '只看收藏表單，再按一次取消篩選';
      button.addEventListener('click', () => collapse(false)); return;
    }
    button.setAttribute('aria-controls', panel.id); button.setAttribute('aria-expanded', 'false');
    button.addEventListener('click', () => {
      if (!panel.hidden && active === button.dataset.shortcut) { collapse(false); return; }
      opener = button; active = button.dataset.shortcut; render(); panel.hidden = false;
      shortcuts.querySelectorAll('[data-shortcut]:not([data-shortcut="favorites"])').forEach(option => option.setAttribute('aria-expanded', String(option === button)));
    });
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !panel.hidden) { event.preventDefault(); collapse(panel.contains(document.activeElement)); }
  });
  window.addEventListener('storage', () => { refresh(); if (!panel.hidden) render(); });
  window.addEventListener('pageshow', () => { refresh(); if (!panel.hidden) render(); });
  refresh(); shortcuts.hidden = false;
})();
