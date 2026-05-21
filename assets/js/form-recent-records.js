/**
 * form-recent-records.js
 * Keeps the latest printed form records in localStorage.
 */

const FormRecentRecords = (() => {
  const RECENT_LIMIT = 20;
  const DRAFT_LIMIT = 5;
  const RECENT_PREFIX = 'hr_form_recent_';
  const DRAFT_PREFIX = 'hr_form_draft_';

  function recentKey(formType) {
    return RECENT_PREFIX + formType;
  }

  function draftKey(formType) {
    return DRAFT_PREFIX + formType;
  }

  function loadByKey(storageKey) {
    try {
      const records = JSON.parse(localStorage.getItem(storageKey)) || [];
      return Array.isArray(records) ? records : [];
    } catch {
      return [];
    }
  }

  function saveByKey(storageKey, records, limit) {
    localStorage.setItem(storageKey, JSON.stringify(records.slice(0, limit)));
  }

  function load(formType) {
    return loadByKey(recentKey(formType));
  }

  function loadDrafts(formType) {
    return loadByKey(draftKey(formType));
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
    const id = existingId || 'r_' + Date.now();
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

  function formatRecordList(records) {
    return records.map((record, index) => {
      const date = new Date(record.updatedAt).toLocaleString('zh-TW', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${index + 1}. ${record.title}（${date}）`;
    }).join('\n');
  }

  function pickFromRecords(records, emptyMessage, promptTitle) {
    if (!records.length) {
      alert(emptyMessage);
      return null;
    }

    const input = prompt(`${promptTitle}\n\n${formatRecordList(records)}`);
    if (!input) return null;

    const index = Number(input) - 1;
    if (!Number.isInteger(index) || index < 0 || index >= records.length) {
      alert('找不到這個編號的資料。');
      return null;
    }

    return records[index];
  }

  function pick(formType) {
    return pickFromRecords(
      load(formType),
      '目前沒有最近紀錄。',
      '請輸入要載入的最近紀錄編號：'
    );
  }

  function pickDraft(formType) {
    return pickFromRecords(
      loadDrafts(formType),
      '目前沒有草稿。',
      '請輸入要載入的草稿編號：'
    );
  }

  function deleteDraftByPrompt(formType) {
    const drafts = loadDrafts(formType);
    const target = pickFromRecords(
      drafts,
      '目前沒有可刪除的草稿。',
      '草稿已達上限，請輸入要刪除的草稿編號：'
    );
    if (!target) return false;
    saveAllDrafts(formType, drafts.filter((draft) => draft.id !== target.id));
    return true;
  }

  function saveDraft(formType, title, data, existingId = '') {
    const drafts = loadDrafts(formType);
    let id = existingId;

    if (!id && drafts.length >= DRAFT_LIMIT) {
      alert(`草稿最多只能保存 ${DRAFT_LIMIT} 筆，請先刪除一筆草稿。`);
      if (!deleteDraftByPrompt(formType)) return null;
    }

    const now = new Date().toISOString();
    const latestDrafts = loadDrafts(formType);
    id = id || 'd_' + Date.now();
    const nextDraft = {
      id,
      title: title || '未命名草稿',
      createdAt: latestDrafts.find((draft) => draft.id === id)?.createdAt || now,
      updatedAt: now,
      data,
    };
    saveAllDrafts(formType, [nextDraft, ...latestDrafts.filter((draft) => draft.id !== id)]);
    return nextDraft;
  }

  return { collect, restore, save, pick, load, saveDraft, pickDraft, loadDrafts };
})();
