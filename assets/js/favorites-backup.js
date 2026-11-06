/* Registry for all user-maintained favorites. Only registered storage keys are writable. */
window.FavoritesBackup = (() => {
  const FORMAT = 'accounting-hr-favorites';
  const VERSION = 1;
  const registry = new Map();
  const isObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);

  function requireValue(condition, message) {
    if (!condition) throw new Error(message);
  }

  function text(record, field, required = false) {
    const value = record[field] === undefined ? '' : record[field];
    requireValue(typeof value === 'string' && value.length <= 10000 && (!required || value.trim()), `欄位 ${field} 格式不正確。`);
    return value;
  }

  function records(value, fields, required, check = () => {}) {
    requireValue(Array.isArray(value) && value.length <= 10000, '常用名單必須是陣列，且最多 10,000 筆。');
    const ids = new Set();
    return value.map(item => {
      requireValue(isObject(item), '常用資料格式不正確。');
      const id = text(item, 'id', true);
      requireValue(/^[a-zA-Z0-9_-]{1,128}$/.test(id) && !ids.has(id), '資料識別碼不正確或重複。');
      ids.add(id);
      const result = { id };
      fields.forEach(field => { result[field] = text(item, field, required.includes(field)); });
      check(result);
      return result;
    });
  }

  // Preserve existing entries on identity conflicts; remap colliding IDs for new entries.
  function mergeRecords(current, incoming, identity) {
    const result = current.map(item => ({ ...item }));
    const byIdentity = new Map(result.map(item => [identity(item), item.id]));
    const ids = new Set(result.map(item => item.id));
    const idMap = new Map();
    incoming.forEach(item => {
      const key = identity(item);
      if (byIdentity.has(key)) {
        idMap.set(item.id, byIdentity.get(key));
        return;
      }
      const id = ids.has(item.id) ? crypto.randomUUID() : item.id;
      ids.add(id);
      byIdentity.set(key, id);
      idMap.set(item.id, id);
      result.push({ ...item, id });
    });
    return { records: result, idMap };
  }

  function registerDataset(name, adapter) {
    requireValue(/^[a-z][a-zA-Z0-9_-]*$/.test(name) && !registry.has(name), '常用資料類別名稱不正確或重複。');
    requireValue(typeof adapter.key === 'string' && ![...registry.values()].some(item => item.key === adapter.key) &&
      typeof adapter.label === 'string' && ['validate', 'merge', 'count'].every(method => typeof adapter[method] === 'function'), '常用資料類別設定不完整。');
    registry.set(name, adapter);
  }

  registerDataset('profiles', {
    key: 'yijia_profiles', label: '個人常用資料', empty: { profiles: [], defaultId: null },
    validate(value) {
      requireValue(isObject(value), '個人常用資料格式不正確。');
      const profiles = records(value.profiles, ['name', 'department', 'jobTitle', 'agent', 'contactPhone'], ['name', 'department']);
      const defaultId = value.defaultId;
      requireValue(defaultId === null || (typeof defaultId === 'string' && profiles.some(item => item.id === defaultId)), '預設人員不存在於名單中。');
      return { profiles, defaultId };
    },
    merge(current, incoming) {
      const merged = mergeRecords(current.profiles, incoming.profiles, item => JSON.stringify([item.name.trim(), item.department.trim()]));
      return { profiles: merged.records, defaultId: current.defaultId || current.profiles[0]?.id ||
        merged.idMap.get(incoming.defaultId) || merged.records[0]?.id || null };
    },
    count: value => value.profiles.length,
  });

  registerDataset('payees', {
    key: 'yijia_payee_favorites', label: '請款對象常用名單', empty: [],
    validate(value) {
      return records(value, ['payee', 'payeeType', 'payMethod', 'taxId', 'bankName', 'bankBranch', 'bankAccount'],
        ['payee', 'payeeType', 'payMethod'], item => {
          requireValue(['company', 'person', 'employee'].includes(item.payeeType) &&
            ['transfer', 'cash', 'check'].includes(item.payMethod), '受款方身分或付款方式不正確。');
          if (item.payMethod === 'transfer') {
            requireValue(item.bankName.trim() && item.bankAccount.trim(), '匯款資料缺少銀行或帳號。');
          } else {
            item.bankName = item.bankBranch = item.bankAccount = '';
          }
          if (item.payeeType === 'employee') item.taxId = '';
        });
    },
    merge: (current, incoming) => mergeRecords(current, incoming, item => item.payee.trim()).records,
    count: value => value.length,
  });

  registerDataset('templates', {
    key: FormTemplates.KEY, label: '表單範本', empty: { payment: [], leave: [], overtime: [], travel: [], purchase: [], receipt: [], simple_receipt: [] },
    validate: FormTemplates.validateAll, merge: FormTemplates.merge,
    count: value => Object.values(value).reduce((total, list) => total + list.length, 0),
  });

  registerDataset('signoffs', {
    key: SignoffStore.KEY, label: '簽核欄設定', empty: {},
    validate: SignoffStore.validate, merge: SignoffStore.merge,
    count: value => Object.keys(value).length,
  });

  registerDataset('reviews', {
    key: ReviewStore.KEY, label: '審核區設定', empty: {},
    validate: ReviewStore.validate, merge: ReviewStore.merge,
    count: value => Object.keys(value).length,
  });

  function read(adapter) {
    const raw = localStorage.getItem(adapter.key);
    return adapter.validate(raw === null ? structuredClone(adapter.empty) : JSON.parse(raw));
  }

  function createExport() {
    const datasets = {};
    registry.forEach((adapter, name) => { datasets[name] = read(adapter); });
    return { format: FORMAT, version: VERSION, exportedAt: new Date().toISOString(), datasets };
  }

  function parse(contents) {
    const file = JSON.parse(contents.replace(/^\uFEFF/, ''));
    requireValue(isObject(file) && file.format === FORMAT, '請選擇由本系統匯出的常用資料 JSON 檔。');
    requireValue(file.version === VERSION, '不支援此備份版本，請使用相容版本的表單中心。');
    requireValue(isObject(file.datasets) && Object.keys(file.datasets).length, '備份檔沒有常用資料類別。');
    const datasets = {};
    Object.entries(file.datasets).forEach(([name, value]) => {
      requireValue(registry.has(name), `尚未支援常用資料類別：${name}。請使用支援此類別的版本匯入。`);
      datasets[name] = registry.get(name).validate(value);
    });
    return datasets;
  }

  function describe(datasets) {
    return Object.entries(datasets).map(([name, value]) => `${registry.get(name).label}：${registry.get(name).count(value)} 筆`).join('；');
  }

  function importData(datasets, mode) {
    requireValue(mode === 'merge' || mode === 'replace', '匯入方式不正確。');
    const changes = Object.entries(datasets).map(([name, value]) => {
      requireValue(registry.has(name), '不支援此常用資料類別。');
      const adapter = registry.get(name);
      const incoming = adapter.validate(value);
      const previous = localStorage.getItem(adapter.key);
      const next = adapter.validate(mode === 'merge' ? adapter.merge(read(adapter), incoming) : incoming);
      return { key: adapter.key, previous, next: JSON.stringify(next) };
    });
    const written = [];
    try {
      changes.forEach(change => {
        localStorage.setItem(change.key, change.next);
        written.push(change);
      });
    } catch (error) {
      let rollbackFailed = false;
      written.reverse().forEach(change => {
        try {
          if (change.previous === null) localStorage.removeItem(change.key);
          else localStorage.setItem(change.key, change.previous);
        } catch { rollbackFailed = true; }
      });
      throw new Error(rollbackFailed ? '儲存失敗且未能完整復原，請保留備份檔並檢查名單。' : '儲存失敗，已保留原有資料。請確認瀏覽器的儲存空間與權限。');
    }
    window.dispatchEvent(new Event('favorites-imported'));
  }

  return { registerDataset, createExport, parse, describe, importData };
})();
