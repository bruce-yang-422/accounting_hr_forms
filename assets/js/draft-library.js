/* Shared draft library and save flow for form pages. Uses native dialog focus handling. */
window.DraftLibrary = (() => {
  let config;
  let dialog;
  let content;
  let message;
  let session;
  let savedSnapshot = '';
  let saveState = null;
  let query = '';
  let order = 'newest';

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }
  function button(label, action, style = '') {
    const result = node('button', `draft-button ${style}`, label);
    result.type = 'button';
    result.addEventListener('click', action);
    return result;
  }
  function data() { return FormRecentRecords.collect(document.getElementById('fillPage')); }
  function currentId() { return window[config.idKey] || ''; }
  function fail(error) { message.textContent = `操作未完成：${error.message || '請確認瀏覽器允許本機儲存且空間足夠。'}`; }
  function list() { return FormRecentRecords.loadDrafts(config.type); }
  function date(value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? '時間未記錄' : parsed.toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
  }
  function updateSession() {
    try {
      const drafts = list();
      document.querySelector('[data-draft-library]').textContent = `草稿庫 (${drafts.length}/${FormRecentRecords.DRAFT_LIMIT})`;
      const draft = drafts.find(item => item.id === currentId());
      if (draft) {
        const dirty = savedSnapshot && JSON.stringify(data()) !== savedSnapshot;
        session.textContent = `${dirty ? '有未儲存的變更' : '已儲存'} · ${draft.title}`;
      } else {
        session.textContent = currentId() ? '目前草稿已從草稿庫移除，請另存新草稿。' : '目前填寫內容尚未儲存為草稿';
      }
    } catch { session.textContent = '無法讀取草稿庫，請開啟草稿庫查看。'; }
  }
  function show() {
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('draft-modal-open');
    message.textContent = '';
  }
  function heading(title, subtitle) {
    content.replaceChildren(node('h3', '', title), node('p', 'draft-hint', subtitle));
  }
  function open() {
    saveState = null;
    query = '';
    show();
    renderLibrary();
  }
  function renderLibrary() {
    message.textContent = '';
    heading(`${config.label}草稿庫`, '依最後更新時間整理。載入前可查看內容，管理操作不會清除目前表單。');
    try {
      const drafts = list();
      const summary = node('div', 'draft-library-summary', `${drafts.length} / ${FormRecentRecords.DRAFT_LIMIT} 筆草稿`);
      if (drafts.length >= FormRecentRecords.DRAFT_LIMIT) summary.append(node('span', 'draft-full', '草稿庫已滿，請刪除舊草稿或更新目前草稿。'));
      content.append(summary);
      const tools = node('div', 'draft-library-tools');
      const search = node('input', 'fi');
      search.type = 'search'; search.placeholder = '搜尋草稿名稱、申請人或內容'; search.setAttribute('aria-label', '搜尋草稿'); search.value = query;
      const sort = node('select', 'fi'); sort.setAttribute('aria-label', '草稿排序');
      sort.add(new Option('最近更新優先', 'newest')); sort.add(new Option('最早更新優先', 'oldest')); sort.add(new Option('依名稱排序', 'name')); sort.value = order;
      tools.append(search, sort); content.append(tools);
      const cards = node('div', 'draft-library-list'); content.append(cards);
      function renderCards() {
        cards.replaceChildren();
        const filtered = drafts.filter(draft => `${draft.title} ${Object.values(draft.data).join(' ')}`.toLowerCase().includes(query.toLowerCase()));
        filtered.sort((a, b) => order === 'name' ? a.title.localeCompare(b.title, 'zh-TW') :
          ((Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)) * (order === 'oldest' ? -1 : 1));
        if (!filtered.length) cards.append(node('div', 'draft-empty', drafts.length ? '沒有符合的草稿，試著換個關鍵字。' : '草稿庫還是空的。先填寫表單，再按「儲存草稿」保留進度。'));
        filtered.forEach(draft => cards.append(card(draft)));
      }
      search.addEventListener('input', () => { query = search.value; renderCards(); });
      sort.addEventListener('change', () => { order = sort.value; renderCards(); });
      renderCards();
      if (saveState) content.append(button('返回儲存草稿', renderSave, 'draft-button-primary'));
    } catch (error) { fail(error); }
    updateSession();
  }
  function card(draft) {
    const article = node('article', 'draft-card');
    const title = node('h4', '', draft.title);
    article.append(title);
    if (draft.id === currentId()) article.append(node('span', 'draft-current', '目前編輯中'));
    article.append(node('p', 'draft-hint', `最後更新 ${date(draft.updatedAt)}`));
    const details = node('details', 'draft-details');
    details.append(node('summary', '', '查看草稿內容'));
    const fields = config.type === 'payment' ? [['applicant', '申請人'], ['department', '部門'], ['reqDate', '請款日期'], ['acctCategory', '科目'], ['reason', '事由'], ['amtGross', '金額'], ['payee', '付款對象'], ['paymentNote', '備註']] :
      [['applicant', '申請人'], ['department', '部門'], ['startDate', '開始日期'], ['endDate', '結束日期'], ['reason', '請假理由'], ['agent', '代理人'], ['remark', '備註']];
    const values = node('dl');
    fields.forEach(([key, label]) => { values.append(node('dt', '', label), node('dd', '', String(draft.data[key] || '未填寫'))); });
    details.append(values); article.append(details);
    const actions = node('div', 'draft-actions');
    const inline = node('div', 'draft-inline');
    actions.append(button('載入', () => {
      inline.replaceChildren(node('p', '', '載入會取代目前表單內容。尚未儲存的變更將不會保留。'));
      inline.append(button('確定載入', () => {
        try {
          const latest = list().find(item => item.id === draft.id);
          if (!latest) throw new Error('這筆草稿已被刪除，請重新開啟草稿庫。');
          config.restore(latest.data);
          window[config.idKey] = latest.id;
          window[config.recentKey] = '';
          savedSnapshot = JSON.stringify(data());
          updateSession(); dialog.close();
        } catch (error) { fail(error); }
      }, 'draft-button-primary'), button('取消', () => inline.replaceChildren()));
    }, 'draft-button-primary'));
    actions.append(button('重新命名', () => {
      const input = node('input', 'fi'); input.value = draft.title; input.maxLength = 120; input.setAttribute('aria-label', '新草稿名稱');
      const form = node('form', 'draft-rename');
      const submit = node('button', 'draft-button draft-button-primary', '儲存名稱'); submit.type = 'submit';
      form.append(input, submit, button('取消', () => inline.replaceChildren()));
      form.addEventListener('submit', event => {
        event.preventDefault();
        try { FormRecentRecords.renameDraft(config.type, draft.id, input.value); renderLibrary(); message.textContent = '草稿名稱已更新。'; } catch (error) { fail(error); }
      });
      inline.replaceChildren(form); input.focus(); input.select();
    }));
    actions.append(button('刪除', () => {
      inline.replaceChildren(node('p', '', `確定刪除「${draft.title}」？刪除後無法復原，目前表單內容會保留。`));
      inline.append(button('確定刪除', () => {
        try {
          FormRecentRecords.deleteDraft(config.type, draft.id);
          if (draft.id === currentId()) resetCurrent();
          renderLibrary(); message.textContent = '草稿已刪除。';
        } catch (error) { fail(error); }
      }, 'draft-button-danger'), button('取消', () => inline.replaceChildren()));
    }, 'draft-button-danger'));
    article.append(actions, inline);
    return article;
  }
  function openSave() {
    show();
    try {
      const current = list().find(draft => draft.id === currentId());
      saveState = { title: current?.title || config.title(), mode: current ? 'update' : 'new', id: current?.id || '' };
      renderSave();
    } catch (error) { heading('無法儲存草稿', '請先檢查草稿庫資料。'); fail(error); }
  }
  function renderSave() {
    message.textContent = '';
    heading('儲存草稿', '草稿可保留未完成的表單；名稱能幫助你之後快速辨識。');
    try {
      const drafts = list();
      const existing = drafts.find(draft => draft.id === saveState.id);
      if (!existing) saveState.mode = 'new';
      const form = node('form', 'draft-save-form');
      const nameLabel = node('label', 'flabel', '草稿名稱'); nameLabel.htmlFor = 'draft-save-title';
      const name = node('input', 'fi'); name.id = 'draft-save-title'; name.required = true; name.maxLength = 120; name.value = saveState.title.slice(0, 120);
      name.addEventListener('input', () => { saveState.title = name.value; });
      const modeLabel = node('label', 'flabel', '儲存方式'); modeLabel.htmlFor = 'draft-save-mode';
      const mode = node('select', 'fi'); mode.id = 'draft-save-mode';
      if (existing) mode.add(new Option('更新目前草稿', 'update'));
      mode.add(new Option('另存新草稿', 'new')); mode.value = saveState.mode;
      const hint = node('p', 'draft-hint');
      const submit = node('button', 'draft-button draft-button-primary', '儲存草稿'); submit.type = 'submit';
      function capacity() {
        saveState.mode = mode.value;
        const full = mode.value === 'new' && drafts.length >= FormRecentRecords.DRAFT_LIMIT;
        submit.disabled = full;
        hint.textContent = full ? '草稿庫已滿，先到草稿庫刪除舊草稿，再返回這裡儲存。' : mode.value === 'update' ? '將更新目前草稿的名稱與內容，保留原本建立時間。' : `將新增一筆草稿，目前 ${drafts.length} / ${FormRecentRecords.DRAFT_LIMIT} 筆。`;
      }
      mode.addEventListener('change', capacity); capacity();
      form.append(nameLabel, name, modeLabel, mode, hint, submit, button('管理草稿庫', () => { query = ''; renderLibrary(); }));
      form.addEventListener('submit', event => {
        event.preventDefault();
        try {
          if (!name.value.trim()) { name.focus(); throw new Error('請輸入草稿名稱。'); }
          const draft = FormRecentRecords.saveDraft(config.type, name.value.trim(), data(), mode.value === 'update' ? saveState.id : '');
          window[config.idKey] = draft.id;
          savedSnapshot = JSON.stringify(data());
          saveState = null; updateSession(); dialog.close();
        } catch (error) { fail(error); }
      });
      content.append(form);
    } catch (error) { fail(error); }
  }
  function resetCurrent() {
    if (!config) return;
    window[config.idKey] = '';
    savedSnapshot = '';
    updateSession();
  }
  function init() {
    const payment = Boolean(document.getElementById('payee'));
    config = payment ? { type: 'payment', label: '請款單', idKey: '__currentPaymentDraftId', recentKey: '__currentRecentPaymentRecordId', title: getPaymentRecordTitle, restore: restorePaymentFormData } :
      { type: 'leave', label: '請假單', idKey: '__currentLeaveDraftId', recentKey: '__currentRecentLeaveRecordId', title: getLeaveRecordTitle, restore: restoreLeaveFormData };
    dialog = node('dialog', 'draft-dialog'); dialog.setAttribute('aria-labelledby', 'draft-dialog-title');
    const header = node('div', 'draft-dialog-header');
    const title = node('h2', '', '草稿管理'); title.id = 'draft-dialog-title';
    header.append(title, button('關閉', () => dialog.close()));
    message = node('p', 'draft-message'); message.setAttribute('role', 'status');
    content = node('div', 'draft-dialog-content');
    dialog.append(header, message, content); document.body.append(dialog);
    dialog.addEventListener('close', () => {
      saveState = null;
      document.documentElement.classList.remove('draft-modal-open');
    });
    session = node('div', 'draft-session'); session.setAttribute('role', 'status');
    document.querySelector('#fillPage .main').prepend(session);
    const scope = document.getElementById('fillPage');
    scope.addEventListener('input', updateSession); scope.addEventListener('change', updateSession);
    window.addEventListener('storage', event => {
      if (event.key === null || event.key === `hr_form_draft_${config.type}`) {
        updateSession();
        if (dialog.open && !saveState) renderLibrary();
      }
    });
    updateSession();
  }
  document.addEventListener('DOMContentLoaded', init);
  return { open, openSave, resetCurrent };
})();
