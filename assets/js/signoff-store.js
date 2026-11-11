/* Sign-off box names per form. Saved values override the defaults; forms render them on the printed sheet. */
const SignoffStore = (() => {
  const KEY = 'hr_form_signoffs';
  const MAX_BOXES = 6;
  const MAX_NAME = 10;
  const FORMS = [
    { id: 'outing', label: '公出申請單', defaults: ['部門主管', '人資', '代理人', '申請人'] },
    { id: 'petty_cash', label: '零用金申請單', defaults: ['部門主管', '會計', '出納', '領款人', '申請人'] },
    { id: 'supply', label: '物品領用單', defaults: ['部門主管', '保管人', '發放人', '申請人'] },
    { id: 'acceptance', label: '採購驗收單', defaults: ['部門主管', '會計', '採購', '保管人', '驗收人', '製單人'] },
    { id: 'expense', label: '支出證明單', defaults: ['核准', '覆核', '會計', '出納', '經辦', '製單'] },
    { id: 'leave', label: '請假單', defaults: ['核決主管', '人資', '代理人', '備查', '歸檔', '申請人'] },
    { id: 'payment', label: '請款單', defaults: ['總經理', '經理', '覆核', '會計', '出納', '製單'] },
    { id: 'overtime', label: '加班申請單', defaults: ['部門主管', '直屬主管', '人資', '薪資', '歸檔', '申請人'] },
    { id: 'travel', label: '出差申請單', defaults: ['總經理', '部門主管', '人資', '會計', '代理人', '申請人'] },
    { id: 'purchaseSimple', label: '採購申請單（精簡版）', defaults: ['部門主管', '會計', '申請人'] },
    { id: 'purchaseFull', label: '採購申請單（完整版）', defaults: ['總經理', '部門主管', '財務', '會計', '採購', '申請人'] },
  ];
  const formOf = id => FORMS.find(form => form.id === id);
  // Equal-level and unfamiliar titles retain their configured relative order.
  const rankGroups = [
    ['董事長', '負責人', '老闆'], ['總經理'], ['副總經理'], ['核准', '核決主管'],
    ['部門主管', '經理'], ['直屬主管'], ['覆核'], ['財務'], ['會計', '人資'],
    ['薪資'], ['採購'], ['保管人', '出納'], ['代理人', '發放人'], ['領款人', '驗收人'],
    ['經辦'], ['備查', '歸檔'], ['領用人'], ['製單', '製單人', '申請人'],
  ];
  const rankOf = name => { const rank = rankGroups.findIndex(group => group.includes(name)); return rank < 0 ? 10 : rank; };
  const ordered = names => [...names].sort((a, b) => rankOf(a) - rankOf(b));
  const legacyDefaults = {
    supply: ['領用人', '部門主管', '保管人', '發放人'],
    acceptance: ['驗收人', '採購', '保管人', '部門主管', '會計'],
  };

  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('簽核欄設定格式不正確。');
    const result = {};
    Object.entries(value).forEach(([id, names]) => {
      if (!formOf(id)) throw new Error(`不支援此表單的簽核欄設定：${id}。`);
      if (!Array.isArray(names) || !names.length || names.length > MAX_BOXES) throw new Error(`每張表單需有 1–${MAX_BOXES} 格簽核欄。`);
      const source = JSON.stringify(names) === JSON.stringify(legacyDefaults[id]) ? formOf(id).defaults : names;
      result[id] = ordered(source.map(name => {
        if (typeof name !== 'string' || !name.trim() || name.trim().length > MAX_NAME) throw new Error(`簽核欄名稱須為 1–${MAX_NAME} 字。`);
        return name.trim();
      }));
    });
    return result;
  }
  // A damaged setting must never stop a form from printing, so it falls back to the defaults.
  function load() {
    try { return validate(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { return {}; }
  }
  const isCustom = id => Object.hasOwn(load(), id);
  const get = id => ordered(load()[id] || formOf(id)?.defaults || []);
  function check(id, names) {
    if (!formOf(id)) throw new Error('不支援此表單。');
    const filled = names.map(name => String(name).trim()).filter(Boolean);
    if (!filled.length) throw new Error('至少要保留 1 格簽核欄。');
    return validate({ ...load(), [id]: filled });
  }
  function save(id, names) {
    const next = check(id, names);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next[id];
  }
  function reset(id) {
    const next = load();
    delete next[id];
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  const merge = (current, incoming) => ({ ...incoming, ...current });

  function render(container) {
    const names = get(container.dataset.signoff);
    container.style.gridTemplateColumns = `repeat(${names.length}, 1fr)`;
    const fixedOrder = !container.closest('.bookstore-sheet');
    if (fixedOrder) container.style.direction = 'ltr';
    container.replaceChildren(...names.map((name, index) => {
      const cell = document.createElement('div'); cell.className = 'pv-sign-cell';
      if (fixedOrder) cell.style.gridColumn = String(index + 1);
      const head = document.createElement('div'); head.className = 'pv-sign-head'; head.textContent = name;
      const body = document.createElement('div'); body.className = 'pv-sign-body';
      cell.append(head, body);
      return cell;
    }));
  }
  function renderAll() { document.querySelectorAll('[data-signoff]').forEach(render); }
  function refreshPreview() {
    document.querySelectorAll('#previewPage .pv-sheet:not(.bookstore-sheet) [data-signoff]').forEach(render);
  }
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', renderAll);
    // The manager opens in another tab, so an open form picks up changes without a reload.
    window.addEventListener('storage', event => { if (event.key === null || event.key === KEY) renderAll(); });
  }

  return { KEY, MAX_BOXES, MAX_NAME, FORMS, validate, load, isCustom, get, check, save, reset, merge, render, renderAll, refreshPreview };
})();

/* The review section above the sign-off boxes. An item with options prints checkboxes, otherwise a blank line. */
const ReviewStore = (() => {
  const KEY = 'hr_form_reviews';
  const MAX_ITEMS = 6;
  const MAX_NAME = 10;
  const MAX_OPTIONS = 4;
  const MAX_OPTION = 6;
  const approve = { name: '核決主管', options: ['同意', '退回'] };
  const line = name => ({ name, options: [] });
  const DEFAULTS = {
    outing: [approve, line('人資確認'), line('簽核備註')],
    petty_cash: [approve, line('會計確認'), line('撥付日期'), line('核銷確認')],
    supply: [approve, line('保管人確認'), line('發放日期')],
    acceptance: [approve, line('採購確認'), line('保管人確認'), line('改善追蹤')],
    expense: [],
    leave: [{ name: '核決主管審核', options: ['同意', '退回'] }, line('人資確認'), line('簽核備註')],
    payment: [line('科目代碼'), { name: '稅別', options: ['應稅', '免稅', '零稅率'] }, line('憑證編號'), line('付款日期'), line('付款編號')],
    overtime: [approve, line('實際打卡'), line('核定時數'), line('簽核備註')],
    travel: [approve, line('人資確認'), line('會計確認')],
    purchaseSimple: [approve, line('會計確認')],
    purchaseFull: [approve, line('採購確認'), line('會計確認')],
  };
  const titleOf = id => (id === 'leave' ? '核決主管審核' : '審核 · 確認');

  function validate(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('審核區設定格式不正確。');
    const result = {};
    Object.entries(value).forEach(([id, items]) => {
      if (!Object.hasOwn(DEFAULTS, id)) throw new Error(`不支援此表單的審核區設定：${id}。`);
      if (!Array.isArray(items) || items.length > MAX_ITEMS) throw new Error(`每張表單的審核區最多 ${MAX_ITEMS} 項。`);
      result[id] = items.map(item => {
        if (!item || typeof item.name !== 'string' || !item.name.trim() || item.name.trim().length > MAX_NAME) throw new Error(`審核區名稱須為 1–${MAX_NAME} 字。`);
        if (!Array.isArray(item.options) || item.options.length > MAX_OPTIONS) throw new Error(`每項最多 ${MAX_OPTIONS} 個勾選項目。`);
        return { name: item.name.trim(), options: item.options.map(option => {
          if (typeof option !== 'string' || !option.trim() || option.trim().length > MAX_OPTION) throw new Error(`勾選項目須為 1–${MAX_OPTION} 字。`);
          return option.trim();
        }) };
      });
    });
    return result;
  }
  function load() {
    try { return validate(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { return {}; }
  }
  const isCustom = id => Object.hasOwn(load(), id);
  const copyItems = items => items.map(item => ({ name: item.name, options: [...item.options] }));
  const get = id => copyItems(load()[id] || DEFAULTS[id] || []);
  function check(id, rows) {
    if (!Object.hasOwn(DEFAULTS, id)) throw new Error('不支援此表單。');
    const items = rows.filter(row => row.name.trim() || row.options.trim()).map(row => {
      if (!row.name.trim()) throw new Error(`勾選項目「${row.options.trim()}」沒有名稱。`);
      return { name: row.name, options: row.options.split(/[、,，\s]+/).filter(Boolean) };
    });
    return validate({ ...load(), [id]: items });
  }
  function save(id, rows) {
    const next = check(id, rows);
    localStorage.setItem(KEY, JSON.stringify(next));
    return next[id];
  }
  function reset(id) {
    const next = load();
    delete next[id];
    localStorage.setItem(KEY, JSON.stringify(next));
  }
  const merge = (current, incoming) => ({ ...incoming, ...current });

  function span(className, text) {
    const element = document.createElement('span');
    element.className = className;
    if (text) element.textContent = text;
    return element;
  }
  function checkbox() {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ui-icon print-checkbox');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use');
    use.setAttribute('href', '#icon-checkbox');
    svg.append(use);
    return svg;
  }
  function render(container) {
    const id = container.dataset.review;
    const items = get(id);
    // Hidden when empty; the sign-off boxes then draw their own top border.
    container.hidden = !items.length;
    const head = document.createElement('div'); head.className = 'pv-ac-head'; head.textContent = titleOf(id);
    const body = document.createElement('div'); body.className = 'pv-ac-body';
    const row = document.createElement('div'); row.className = 'pv-ac-row pv-ac-items';
    items.forEach(item => {
      const entry = span('pv-ac-item');
      entry.dataset.reviewName = item.name;
      entry.append(span('pv-ac-lbl', item.name));
      if (item.options.length) item.options.forEach(option => {
        const choice = span('pv-pcheck');
        choice.append(checkbox(), ` ${option}`);
        entry.append(choice);
      });
      else entry.append(span('pv-uline pv-uline-lg'));
      row.append(entry);
    });
    body.append(row);
    container.replaceChildren(head, body);
  }
  function renderAll() { document.querySelectorAll('[data-review]').forEach(render); }
  if (typeof document !== 'undefined') {
    document.addEventListener('DOMContentLoaded', renderAll);
    window.addEventListener('storage', event => { if (event.key === null || event.key === KEY) renderAll(); });
  }

  return { KEY, MAX_ITEMS, MAX_NAME, titleOf, validate, load, isCustom, get, check, save, reset, merge, render, renderAll };
})();
