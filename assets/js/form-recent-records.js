/**
 * form-recent-records.js
 * Keeps the latest printed form records in localStorage.
 */

const FormRecentRecords = (() => {
  const RECENT_LIMIT = 20;
  const DRAFT_LIMIT = 20;
  const RECENT_PREFIX = 'hr_form_recent_';
  const DRAFT_PREFIX = 'hr_form_draft_';

  function recentKey(formType) {
    return RECENT_PREFIX + formType;
  }

  function draftKey(formType) {
    return DRAFT_PREFIX + formType;
  }

  function saveByKey(storageKey, records, limit) {
    localStorage.setItem(storageKey, JSON.stringify(records.slice(0, limit)));
  }

  function load(formType) {
    return loadRecords(recentKey(formType), '完成紀錄');
  }

  function loadDrafts(formType) {
    return loadRecords(draftKey(formType), '草稿');
  }

  function loadRecords(key, label) {
    const raw = localStorage.getItem(key);
    let drafts;
    try { drafts = raw === null ? [] : JSON.parse(raw); }
    catch { throw new Error(`${label}資料無法讀取，請先保留瀏覽器資料並檢查，避免覆寫。`); }
    if (!Array.isArray(drafts) || drafts.some(draft => !draft || typeof draft.id !== 'string' ||
      typeof draft.title !== 'string' || !draft.data || typeof draft.data !== 'object' || Array.isArray(draft.data)) ||
      new Set(drafts.map(draft => draft.id)).size !== drafts.length) {
      throw new Error(`${label}資料格式異常，請先保留瀏覽器資料並檢查，避免覆寫。`);
    }
    return drafts;
  }

  function saveAll(formType, records) {
    saveByKey(recentKey(formType), records, RECENT_LIMIT);
  }

  function saveAllDrafts(formType, records) {
    saveByKey(draftKey(formType), records, DRAFT_LIMIT);
  }

  function collect(scope = document) {
    const data = {};
    const radioNames = new Set();
    const checkboxNames = new Set();

    scope.querySelectorAll('input, select, textarea').forEach((el) => {
      if (!el.id && !el.name) return;

      if (el.type === 'radio') {
        if (!el.name || radioNames.has(el.name)) return;
        radioNames.add(el.name);
        const checked = scope.querySelector(`input[name="${el.name}"]:checked`);
        data[el.name] = checked ? checked.value : '';
        return;
      }

      if (el.type === 'checkbox') {
        if (!el.name || checkboxNames.has(el.name)) return;
        checkboxNames.add(el.name);
        data[el.name] = Array.from(scope.querySelectorAll(`input[name="${el.name}"]:checked`)).map((item) => item.value);
        return;
      }

      data[el.id || el.name] = el.value;
    });

    return data;
  }

  function restore(data, scope = document) {
    Object.entries(data || {}).forEach(([name, value]) => {
      const byId = scope.getElementById ? scope.getElementById(name) : document.getElementById(name);
      if (byId && byId.type !== 'radio' && byId.type !== 'checkbox') {
        byId.value = value || '';
        byId.dispatchEvent(new Event('input', { bubbles: true }));
        byId.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }

      const fields = scope.querySelectorAll(`[name="${name}"]`);
      if (!fields.length) return;

      fields.forEach((field) => {
        if (field.type === 'radio') {
          field.checked = field.value === value;
          field.closest('.rpill')?.classList.toggle('active', field.checked);
          if (field.checked) field.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (field.type === 'checkbox') {
          field.checked = Array.isArray(value) && value.includes(field.value);
          field.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
  }

  function save(formType, title, data, existingId = '') {
    const now = new Date().toISOString();
    const records = load(formType);
    const id = existingId || 'r_' + crypto.randomUUID();
    const nextRecord = {
      id,
      title: title || '未命名紀錄',
      createdAt: records.find((record) => record.id === id)?.createdAt || now,
      updatedAt: now,
      data,
    };
    const nextRecords = [nextRecord, ...records.filter((record) => record.id !== id)];
    saveAll(formType, nextRecords);
    return nextRecord;
  }

  function saveDraft(formType, title, data, existingId = '') {
    const drafts = loadDrafts(formType);
    if (existingId && !drafts.some(draft => draft.id === existingId)) throw new Error('原草稿已被刪除，請選擇另存新草稿。');
    if (!existingId && drafts.length >= DRAFT_LIMIT) throw new Error(`草稿庫已滿（${DRAFT_LIMIT} 筆），請先管理草稿或更新目前草稿。`);
    const now = new Date().toISOString();
    const id = existingId || 'd_' + crypto.randomUUID();
    const nextDraft = {
      id,
      title: title || '未命名草稿',
      createdAt: drafts.find((draft) => draft.id === id)?.createdAt || now,
      updatedAt: now,
      data,
    };
    saveAllDrafts(formType, [nextDraft, ...drafts.filter((draft) => draft.id !== id)]);
    return nextDraft;
  }

  function renameDraft(formType, id, title) {
    if (!title.trim()) throw new Error('請輸入草稿名稱。');
    const drafts = loadDrafts(formType);
    const draft = drafts.find(item => item.id === id);
    if (!draft) throw new Error('找不到這筆草稿，請重新整理草稿庫。');
    draft.title = title.trim();
    draft.updatedAt = new Date().toISOString();
    saveAllDrafts(formType, drafts);
    return draft;
  }

  function deleteDraft(formType, id) {
    const drafts = loadDrafts(formType);
    saveAllDrafts(formType, drafts.filter(draft => draft.id !== id));
  }

  function deleteRecent(formType, id) {
    saveAll(formType, load(formType).filter(record => record.id !== id));
  }

  return { collect, restore, save, load, saveDraft, loadDrafts, renameDraft, deleteDraft, deleteRecent, DRAFT_LIMIT, RECENT_LIMIT };
})();
