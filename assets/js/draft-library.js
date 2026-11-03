/* One library for continuing drafts, reusing templates and managing completed records. */
window.DraftLibrary = (() => {
  let config, dialog, content, message, session, sessionText, sessionAction, sessionCancel;
  let savedSnapshot = '', templateId = '', originLabel = '';
  let tab = 'drafts', saveState = null, query = '', order = 'newest', page = 1;
  const { node, button: uiButton } = FavoritesUI;
  const button = (label, action, style = '') => uiButton(label, action, `draft-button ${style}`);
  const labels = { drafts: '草稿', templates: '範本', recent: '最近完成' };
  const descriptions = {
    drafts: '保留填寫進度，選擇草稿即可繼續。',
    templates: '帶入固定內容，保留申請人並清除舊日期與單號。',
    recent: '最近 20 筆列印紀錄，可修改原單或另開新單。',
  };
  const data = () => FormRecentRecords.collect(document.getElementById('fillPage'));
  const currentId = () => window[config.idKey] || '';
  const limit = kind => kind === 'templates' ? FormTemplates.LIMIT : kind === 'recent' ? FormRecentRecords.RECENT_LIMIT : FormRecentRecords.DRAFT_LIMIT;
  const list = (kind = tab) => kind === 'templates' ? FormTemplates.load(config.type) : kind === 'recent' ? FormRecentRecords.load(config.type) : FormRecentRecords.loadDrafts(config.type);
  const fail = error => { message.textContent = `操作未完成：${error.message}`; };
  const date = value => Number.isNaN(Date.parse(value)) ? '時間未記錄' : new Date(value).toLocaleString('zh-TW', { timeZone: 'Asia/Taipei', hour12: false });
  function updateSession() {
    if (!config) return;
    for (const [selector, kind] of [['[data-draft-library]', 'drafts'], ['[data-template-library]', 'templates'], ['[data-recent-library]', 'recent']]) {
      try { const element = document.querySelector(selector); if (element) element.textContent = `${kind === 'drafts' ? '草稿庫' : kind === 'templates' ? '範本庫' : '最近完成'} (${list(kind).length}/${limit(kind)})`; } catch {}
    }
    session.classList.toggle('is-template-editing', Boolean(templateId));
    sessionAction.hidden = !templateId;
    sessionCancel.hidden = !templateId;
    if (templateId) {
      sessionText.textContent = '正在修改範本內容，完成後按「儲存範本變更」。';
      return;
    }
    try {
      const record = list('drafts').find(item => item.id === currentId());
      sessionText.textContent = record ? `${savedSnapshot && JSON.stringify(data()) !== savedSnapshot ? '有未儲存的變更' : '已儲存'} · ${record.title}` :
        currentId() ? '目前草稿已移除，請另存新草稿。' : originLabel || '目前填寫內容尚未儲存為草稿';
    } catch { sessionText.textContent = '無法讀取草稿庫，請開啟資料庫查看。'; }
  }
  function show() {
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('draft-modal-open'); message.textContent = '';
  }
  function open(kind = 'drafts') {
    tab = kind; saveState = null; query = ''; page = 1; show(); renderLibrary();
  }
  function renderLibrary() {
    message.textContent = ''; content.replaceChildren();
    const tabs = node('div', 'form-library-tabs'); tabs.setAttribute('role', 'tablist'); tabs.setAttribute('aria-label', '表單資料分類');
    for (const kind of Object.keys(labels)) {
      let count = '?'; try { count = list(kind).length; } catch {}
      const item = button('', () => { tab = kind; query = ''; page = 1; renderLibrary(); content.querySelector(`[data-library-tab="${kind}"]`).focus(); });
      item.append(node('span', '', labels[kind]), node('small', '', `${count}/${limit(kind)}`));
      item.dataset.libraryTab = kind; item.id = `form-library-tab-${kind}`;
      item.setAttribute('role', 'tab'); item.setAttribute('aria-selected', String(tab === kind)); item.setAttribute('aria-controls', 'form-library-panel'); item.tabIndex = tab === kind ? 0 : -1;
      item.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
        event.preventDefault(); const kinds = Object.keys(labels); const next = kinds[(kinds.indexOf(kind) + (event.key === 'ArrowRight' ? 1 : 2)) % 3];
        tab = next; query = ''; page = 1; renderLibrary(); content.querySelector(`[data-library-tab="${next}"]`).focus();
      }); tabs.append(item);
    }
    content.append(tabs);
    const panel = node('div'); panel.id = 'form-library-panel'; panel.setAttribute('role', 'tabpanel'); panel.setAttribute('aria-labelledby', `form-library-tab-${tab}`);
    panel.append(node('p', 'draft-hint form-library-description', descriptions[tab])); content.append(panel);
    try {
      const records = list();
      const toolbar = node('div', 'form-library-heading');
      if (tab === 'templates') toolbar.append(button(templateId ? '儲存範本變更' : '將目前表單存為範本', () => openSave('templates'), 'draft-button-primary'));
      else if (tab === 'drafts') toolbar.append(button('儲存目前草稿', () => openSave('drafts'), 'draft-button-primary'));
      if (tab !== 'recent' && records.length >= limit(tab)) panel.append(node('p', 'draft-hint draft-full', `${labels[tab]}庫已滿，仍可更新現有內容，或刪除舊資料後新增。`));
      const tools = node('div', `draft-library-tools form-library-tools${tab === 'recent' ? ' without-action' : ''}`);
      const search = node('input', 'fi'); search.type = 'search'; search.placeholder = `搜尋${labels[tab]}名稱或內容`; search.setAttribute('aria-label', `搜尋${labels[tab]}`); search.value = query;
      const sort = node('select', 'fi'); sort.setAttribute('aria-label', '資料排序');
      sort.add(new Option('最近更新優先', 'newest')); sort.add(new Option('最早更新優先', 'oldest')); sort.add(new Option('依名稱排序', 'name')); sort.value = order;
      tools.append(search, sort); if (toolbar.childElementCount) tools.append(toolbar); panel.append(tools);
      const summary = node('p', 'draft-hint form-library-result'); summary.setAttribute('role', 'status');
      const cards = node('div', 'draft-library-list');
      const pager = node('nav', 'form-library-pages'); pager.setAttribute('aria-label', '資料分頁');
      const previous = button('上一頁', () => { page--; renderCards(); panel.scrollIntoView({ block: 'start' }); });
      const pageLabel = node('span'); const next = button('下一頁', () => { page++; renderCards(); panel.scrollIntoView({ block: 'start' }); });
      pager.append(previous, pageLabel, next); panel.append(summary, cards, pager);
      function renderCards() {
        const filtered = records.filter(record => `${record.title} ${Object.values(record.data).join(' ')}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
        filtered.sort((a, b) => order === 'name' ? a.title.localeCompare(b.title, 'zh-TW') : ((Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0)) * (order === 'oldest' ? -1 : 1));
        const pages = Math.max(1, Math.ceil(filtered.length / 5)); page = Math.min(Math.max(1, page), pages);
        cards.replaceChildren();
        const start = (page - 1) * 5;
        summary.textContent = filtered.length ? `顯示 ${start + 1}–${Math.min(start + 5, filtered.length)} 筆，共 ${filtered.length} 筆` : '';
        summary.hidden = !query.trim() && filtered.length <= 5;
        if (!filtered.length) {
          const empty = node('div', 'draft-empty');
          empty.append(node('p', '', records.length ? '沒有符合的資料，換個關鍵字再找找。' : tab === 'templates' ? '還沒有範本。填好固定內容後，按上方「將目前表單存為範本」。' : tab === 'recent' ? '尚無完成紀錄。列印／另存 PDF 前會自動保存。' : '還沒有草稿，按「儲存目前草稿」保留填寫進度。'));
          if (records.length) empty.append(button('清除搜尋', () => { query = ''; search.value = ''; renderCards(); search.focus(); }));
          cards.append(empty);
        }
        filtered.slice(start, start + 5).forEach(record => cards.append(card(record, tab)));
        previous.disabled = page === 1; next.disabled = page === pages; pageLabel.textContent = `${page} / ${pages} 頁`; pager.hidden = filtered.length <= 5;
      }
      search.addEventListener('input', () => { query = search.value; page = 1; renderCards(); }); sort.addEventListener('change', () => { order = sort.value; page = 1; renderCards(); }); renderCards();
      if (saveState) panel.append(button(`返回儲存${labels[saveState.kind]}`, renderSave, 'draft-button-primary'));
    } catch (error) { fail(error); }
    updateSession();
  }
  function freshData(record) {
    const current = data();
    const payload = Object.fromEntries(Object.entries(current).map(([key, value]) => [key, Array.isArray(value) ? [] : '']));
    for (const key of ['applicant', 'department', 'jobTitle', 'employeeId', 'manager', 'agent', 'contactPhone']) if (Object.hasOwn(current, key)) payload[key] = current[key];
    Object.assign(payload, FormTemplates.extract(config.type, record.data));
    const today = new Date(); payload.reqDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return payload;
  }
  function loadRecord(id, kind, editing = false, copy = false) {
    const record = list(kind).find(item => item.id === id); if (!record) throw new Error('這筆資料已被刪除，請重新選取。');
    const fresh = kind === 'templates' || copy;
    config.restore(fresh ? freshData(record) : { ...Object.fromEntries(Object.entries(data()).map(([key, value]) => [key, Array.isArray(value) ? [] : ''])), ...record.data });
    window[config.idKey] = kind === 'drafts' ? record.id : '';
    window[config.recentKey] = kind === 'recent' && !copy ? record.id : '';
    templateId = editing ? record.id : '';
    savedSnapshot = kind === 'drafts' ? JSON.stringify(data()) : '';
    originLabel = fresh ? `已${editing ? '開啟範本供修改' : '帶入固定內容'}：${record.title}。請補上本次資料，完成後可儲存草稿。` : kind === 'recent' ? `已載入完成紀錄：${record.title}` : '';
    updateSession(); dialog.close();
  }
  function card(record, kind) {
    const article = node('article', 'draft-card'); const info = node('div', 'draft-card-info');
    const meta = node('div', 'draft-card-meta'); meta.append(node('p', 'draft-hint', `更新 ${date(record.updatedAt)}`));
    if (kind === 'drafts' && record.id === currentId()) meta.append(node('span', 'draft-current', '編輯中'));
    info.append(node('h4', '', record.title), meta);
    const details = node('details', 'draft-details'); details.append(node('summary', '', '查看內容'));
    const fields = config.type === 'payment' ? [['applicant', '申請人'], ['reqDate', '請款日期'], ['acctCategory', '科目'], ['reason', '事由'], ['amtGross', '金額'], ['payee', '付款對象'], ['paymentNote', '備註']] : [['applicant', '申請人'], ['startDate', '開始日期'], ['endDate', '結束日期'], ['reason', '理由'], ['handover', '交接'], ['remark', '備註']];
    const values = node('dl'); fields.filter(([key]) => kind !== 'templates' || Object.hasOwn(record.data, key)).forEach(([key, label]) => values.append(node('dt', '', label), node('dd', '', String(record.data[key] || '未填寫')))); details.append(values); info.append(details);
    const actions = node('div', 'draft-actions'); const inline = node('div', 'draft-inline');
    function requestLoad(editing = false, copy = false) {
      inline.replaceChildren(node('p', '', kind === 'templates' || copy ? '將保留目前申請人，清除日期與單號並帶入固定內容。其他未儲存變更會被取代。' : '載入會取代目前表單內容，請先確認未儲存的變更。'),
        button(kind === 'templates' || copy ? '確定帶入' : '確定載入', () => { try { loadRecord(record.id, kind, editing, copy); } catch (error) { fail(error); } }, 'draft-button-primary'), button('取消', () => inline.replaceChildren()));
    }
    actions.append(button(kind === 'templates' ? '套用' : kind === 'recent' ? '載入修改' : '繼續填寫', () => requestLoad(), 'draft-button-primary'));
    if (kind === 'recent') actions.append(button('另開新單', () => requestLoad(false, true)));
    const manage = node('details', 'form-library-manage'); manage.append(node('summary', '', `管理${kind === 'recent' ? '紀錄' : labels[kind]}`));
    const menu = node('div', 'form-library-menu');
    menu.addEventListener('click', event => { if (event.target.closest('button')) manage.open = false; });
    manage.addEventListener('toggle', () => {
      if (!manage.open || !manage.isConnected) return;
      content.querySelectorAll('.form-library-manage[open]').forEach(other => { if (other !== manage) other.open = false; });
      menu.classList.remove('opens-up');
      if (menu.getBoundingClientRect().bottom > dialog.getBoundingClientRect().bottom - 8) menu.classList.add('opens-up');
    });
    if (kind === 'templates') menu.append(button('修改內容', () => requestLoad(true)));
    if (kind !== 'recent') menu.append(button('重新命名', () => {
      const input = node('input', 'fi'); input.value = record.title; input.required = true; input.maxLength = 120; input.setAttribute('aria-label', '新名稱');
      const form = node('form', 'draft-rename'); const submit = node('button', 'draft-button draft-button-primary', '儲存名稱'); submit.type = 'submit';
      form.append(input, submit, button('取消', () => inline.replaceChildren()));
      form.addEventListener('submit', event => { event.preventDefault(); try {
        if (kind === 'templates') FormTemplates.rename(config.type, record.id, input.value); else FormRecentRecords.renameDraft(config.type, record.id, input.value);
        renderLibrary(); message.textContent = '名稱已更新。';
      } catch (error) { fail(error); } }); inline.replaceChildren(form); input.focus(); input.select();
    }));
    menu.append(button('刪除', () => {
      inline.replaceChildren(node('p', '', `確定刪除「${record.title}」？目前表單內容會保留。`), button('確定刪除', () => { try {
        if (kind === 'templates') { FormTemplates.remove(config.type, record.id); if (templateId === record.id) templateId = ''; }
        else if (kind === 'recent') { FormRecentRecords.deleteRecent(config.type, record.id); if (window[config.recentKey] === record.id) window[config.recentKey] = ''; }
        else { FormRecentRecords.deleteDraft(config.type, record.id); if (record.id === currentId()) resetCurrent(); }
        renderLibrary(); message.textContent = '已刪除，目前表單內容保留。';
      } catch (error) { fail(error); } }, 'draft-button-danger'), button('取消', () => inline.replaceChildren()));
    }, 'draft-button-danger'));
    manage.append(menu);
    const controls = node('div', 'draft-card-controls'); controls.append(actions, manage);
    article.append(info, controls, inline); return article;
  }
  function openSave(kind = 'drafts') {
    show();
    try {
      const current = list(kind).find(record => record.id === (kind === 'templates' ? templateId : currentId()));
      const suggested = kind === 'templates' ? (document.getElementById(config.type === 'payment' ? 'acctCategory' : 'reason').value || `常用${config.label}範本`) : config.title();
      saveState = { kind, title: current?.title || suggested, mode: current ? 'update' : 'new', id: current?.id || '' }; renderSave();
    } catch (error) { content.replaceChildren(node('h3', '', '暫時無法儲存')); fail(error); }
  }
  function renderSave() { try { renderSaveForm(); } catch (error) { fail(error); } }
  function renderSaveForm() {
    message.textContent = ''; const kind = saveState.kind; const label = labels[kind]; const records = list(kind);
    const existing = records.find(record => record.id === saveState.id); if (!existing) saveState.mode = 'new';
    content.replaceChildren(node('h3', '', `儲存${label}`), node('p', 'draft-hint', kind === 'templates' ? '為固定內容取個好找的名稱，例如「每月雲端費」或「固定上午特休」。日期、單號及申請人不會存入範本。' : '保存目前所有填寫進度，下次可繼續填寫。'));
    const form = node('form', 'draft-save-form'); const nameLabel = node('label', 'flabel', `${label}名稱`); nameLabel.htmlFor = 'draft-save-title';
    const name = node('input', 'fi'); name.id = 'draft-save-title'; name.required = true; name.maxLength = 120; name.value = saveState.title.slice(0, 120); name.addEventListener('input', () => { saveState.title = name.value; });
    const modeLabel = node('label', 'flabel', '儲存方式'); modeLabel.htmlFor = 'draft-save-mode';
    const mode = node('select', 'fi'); mode.id = 'draft-save-mode'; if (existing) mode.add(new Option(`更新目前${label}`, 'update')); mode.add(new Option(`另存新${label}`, 'new')); mode.value = saveState.mode;
    const hint = node('p', 'draft-hint'); const submit = node('button', 'draft-button draft-button-primary', `儲存${label}`); submit.type = 'submit';
    function capacity() { saveState.mode = mode.value; submit.disabled = mode.value === 'new' && records.length >= limit(kind); hint.textContent = submit.disabled ? `${label}庫已滿，請先管理舊資料，再返回這裡儲存。` : `${records.length} / ${limit(kind)} 筆${label} · ${mode.value === 'update' ? '更新原有資料' : '新增一筆資料'}`; }
    mode.addEventListener('change', capacity); capacity(); form.append(nameLabel, name, modeLabel, mode, hint, submit, button(`管理${label}庫`, () => { tab = kind; query = ''; page = 1; renderLibrary(); }));
    form.addEventListener('submit', event => { event.preventDefault(); try {
      if (!name.value.trim()) throw new Error('請輸入名稱。');
      if (kind === 'templates') FormTemplates.save(config.type, name.value.trim(), data(), mode.value === 'update' ? saveState.id : '');
      else { const draft = FormRecentRecords.saveDraft(config.type, name.value.trim(), data(), mode.value === 'update' ? saveState.id : ''); window[config.idKey] = draft.id; savedSnapshot = JSON.stringify(data()); }
      templateId = ''; originLabel = kind === 'templates' ? `已儲存範本「${name.value.trim()}」，目前表單可繼續填寫。` : ''; saveState = null; updateSession(); dialog.close();
    } catch (error) { fail(error); } }); content.append(form);
  }
  function resetCurrent() { if (!config) return; window[config.idKey] = ''; savedSnapshot = ''; templateId = ''; originLabel = ''; updateSession(); }
  function init() {
    config = document.getElementById('payee') ? { type: 'payment', label: '請款單', idKey: '__currentPaymentDraftId', recentKey: '__currentRecentPaymentRecordId', title: getPaymentRecordTitle, restore: restorePaymentFormData } :
      { type: 'leave', label: '請假單', idKey: '__currentLeaveDraftId', recentKey: '__currentRecentLeaveRecordId', title: getLeaveRecordTitle, restore: restoreLeaveFormData };
    dialog = node('dialog', 'draft-dialog'); dialog.setAttribute('aria-labelledby', 'draft-dialog-title');
    const header = node('div', 'draft-dialog-header'); const title = node('h2', '', `${config.label}資料庫`); title.id = 'draft-dialog-title'; header.append(title, button('關閉', () => dialog.close()));
    message = node('p', 'draft-message'); message.setAttribute('role', 'status'); content = node('div', 'draft-dialog-content'); dialog.append(header, message, content); document.body.append(dialog);
    dialog.addEventListener('close', () => { if (dialog.open) return; saveState = null; document.documentElement.classList.remove('draft-modal-open'); });
    session = node('div', 'draft-session'); session.setAttribute('role', 'status');
    sessionText = node('span'); sessionAction = button('儲存範本變更', () => openSave('templates')); sessionAction.hidden = true;
    sessionCancel = button('取消修改', () => { templateId = ''; originLabel = '已取消範本修改，原範本未變更，目前表單內容保留。'; updateSession(); }); sessionCancel.hidden = true;
    session.append(sessionText, sessionAction, sessionCancel); document.querySelector('#fillPage .main').prepend(session);
    document.getElementById('fillPage').addEventListener('input', updateSession); document.getElementById('fillPage').addEventListener('change', updateSession);
    window.addEventListener('storage', event => {
      if (event.key === null || [FormTemplates.KEY, `hr_form_draft_${config.type}`, `hr_form_recent_${config.type}`].includes(event.key)) { updateSession(); if (dialog.open && !saveState) renderLibrary(); }
    }); updateSession();
  }
  document.addEventListener('DOMContentLoaded', init);
  return { open, openSave: () => openSave('drafts'), openTemplates: () => open('templates'), openRecent: () => open('recent'), resetCurrent, refreshCounts: updateSession,
    getSessionSnapshot: () => savedSnapshot, restoreSessionSnapshot(snapshot) { savedSnapshot = typeof snapshot === 'string' ? snapshot : ''; updateSession(); },
    getLibraryState: () => ({ templateId, originLabel }), restoreLibraryState(value) { templateId = value?.templateId || ''; originLabel = value?.originLabel || ''; updateSession(); },
  };
})();
