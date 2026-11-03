/* Shared recipient storage for the payment form and favorites management page. */
const PayeeStore = (() => {
  const KEY = 'yijia_payee_favorites';
  const typeLabels = { company: '公司', person: '自然人', employee: '員工' };
  const methodLabels = { transfer: '匯款轉帳', cash: '現金', check: '支票' };
  const fields = ['payee', 'payeeType', 'payMethod', 'taxId', 'bankName', 'bankBranch', 'bankAccount'];

  function normalize(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('付款對象資料格式不正確。');
    const result = {};
    fields.forEach(field => {
      const text = value[field] ?? '';
      if (typeof text !== 'string' || text.length > 10000) throw new Error('付款對象欄位格式不正確。');
      result[field] = text.trim();
    });
    if (!result.payee) throw new Error('請填寫付款對象（戶名）。');
    if (!Object.hasOwn(typeLabels, result.payeeType) || !Object.hasOwn(methodLabels, result.payMethod)) throw new Error('請選擇受款方身分與付款方式。');
    if (result.payeeType === 'employee') result.taxId = '';
    if (result.payMethod === 'transfer') {
      if (!result.bankName || !result.bankAccount) throw new Error('匯款轉帳請填寫銀行及帳號。');
    } else {
      result.bankName = result.bankBranch = result.bankAccount = '';
    }
    return result;
  }

  function getAll() {
    const raw = localStorage.getItem(KEY);
    let records;
    try { records = raw === null ? [] : JSON.parse(raw); }
    catch { throw new Error('付款對象名單無法讀取，請先保留瀏覽器資料並檢查。'); }
    if (!Array.isArray(records)) throw new Error('付款對象名單格式不正確。');
    const ids = new Set();
    return records.map(record => {
      if (!record || typeof record.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(record.id) || ids.has(record.id)) throw new Error('付款對象識別碼不正確或重複。');
      ids.add(record.id);
      return { id: record.id, ...normalize(record) };
    });
  }

  function write(records) {
    localStorage.setItem(KEY, JSON.stringify(records));
    window.dispatchEvent(new Event('payee-favorites-changed'));
  }

  function save(value, existingId = '') {
    const normalized = normalize(value);
    const records = getAll();
    const index = records.findIndex(record => record.id === existingId);
    if (existingId && index === -1) throw new Error('原付款對象已被刪除，請取消編輯後重新新增。');
    if (records.some(record => record.payee === normalized.payee && record.id !== existingId)) throw new Error('此戶名已存在，請編輯原有資料或使用不同戶名。');
    const record = { id: existingId || crypto.randomUUID(), ...normalized };
    if (index === -1) records.push(record);
    else records[index] = record;
    write(records);
    return record;
  }

  function remove(id) {
    write(getAll().filter(record => record.id !== id));
  }

  return { KEY, typeLabels, methodLabels, getAll, save, remove };
})();
