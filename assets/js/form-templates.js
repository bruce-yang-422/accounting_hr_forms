/* Reusable form content only; transaction dates, document numbers and applicant identity are excluded. */
const FormTemplates = (() => {
  const KEY = 'hr_form_templates';
  const LIMIT = 20;
  const fields = {
    simple_receipt: ['payer', 'amount', 'payMethod', 'bankName', 'bankBranch', 'bankAccount', 'accountLast5', 'methodOther', 'reason', 'recipient', 'contactPhone'],
    receipt: ['sellerTaxId', 'buyer', 'buyerAddress', 'buyerTaxId', 'reason', 'paid', ...Array.from({ length: 7 }, (_, i) => ['Name', 'Qty', 'Price'].map(field => `item${i + 1}${field}`)).flat()],
    payment: ['printLayout', 'acctCategory', 'reason', 'taxMode', 'amtGross', 'payee', 'payeeType', 'taxId', 'payMethod', 'bankName', 'bankBranch', 'bankAccount', 'voucherType', 'hasAttach', 'attachCount', 'attachTypes', 'attachOtherText', 'paymentNote'],
    leave: ['printLayout', 'leaveType', 'leaveTypeOther', 'startHour', 'startMinute', 'endHour', 'endMinute', 'reasonMode', 'reasonPreset', 'reason', 'bereavementRelation', 'handover', 'hasProof', 'proofNote', 'remark', 'note'],
    overtime: ['applyType', 'dayType', 'compensation', 'startHour', 'startMinute', 'endHour', 'endMinute', 'restMinutes', 'reason', 'workContent', 'remark'],
    travel: ['travelType', 'tripType', 'destination', 'visitTarget', 'startHour', 'startMinute', 'endHour', 'endMinute', 'reason', 'transportModes', 'transportOther', 'needLodging', 'lodgingNote', 'handover', 'costTransport', 'costLodging', 'costMeal', 'costOther', 'advanceNeeded', 'advanceAmount', 'remark'],
    purchase: ['purchaseMode', 'category', 'categoryOther', 'urgency', 'reason', 'taxBasis', ...Array.from({ length: 15 }, (_, i) => ['Name', 'Spec', 'Qty', 'Unit', 'Price'].map(field => `item${i + 1}${field}`)).flat(), 'supplier1Channel', 'supplier1Name', 'supplier1Contact', 'supplier1Quote', 'supplier2Channel', 'supplier2Name', 'supplier2Contact', 'supplier2Quote', 'supplier3Channel', 'supplier3Name', 'supplier3Contact', 'supplier3Quote', 'recommendedSupplier', 'hasQuote', 'quoteCount', 'remark'],
  };
  const arrayFields = new Set(['attachTypes', 'transportModes', 'paid']);
  function extract(type, data) {
    if (!Object.hasOwn(fields, type) || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error('範本內容格式不正確。');
    const result = {};
    fields[type].forEach(key => {
      if (!Object.hasOwn(data, key)) return;
      const value = data[key];
      if (arrayFields.has(key)) {
        if (!Array.isArray(value) || value.some(item => typeof item !== 'string' || item.length > 100)) throw new Error('範本複選欄位格式不正確。');
        result[key] = [...value];
      } else {
        if (typeof value !== 'string' || value.length > 10000) throw new Error('範本欄位格式不正確。');
        result[key] = value;
      }
    });
    return result;
  }
  function validateAll(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value) || Object.keys(value).some(key => !Object.hasOwn(fields, key))) throw new Error('範本庫格式不正確。');
    const result = {};
    Object.keys(fields).forEach(type => {
      const list = value[type] === undefined ? [] : value[type];
      if (!Array.isArray(list) || list.length > LIMIT) throw new Error(`每種表單最多 ${LIMIT} 筆範本。`);
      const ids = new Set(), titles = new Set();
      result[type] = list.map(record => {
        if (!record || typeof record.id !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(record.id) || ids.has(record.id) ||
          typeof record.title !== 'string' || !record.title.trim() || record.title.length > 120 || titles.has(record.title.trim())) throw new Error('範本名稱或識別碼不正確或重複。');
        ids.add(record.id); titles.add(record.title.trim());
        return { id: record.id, title: record.title.trim(), createdAt: typeof record.createdAt === 'string' ? record.createdAt : '',
          updatedAt: typeof record.updatedAt === 'string' ? record.updatedAt : '', data: extract(type, record.data) };
      });
    });
    return result;
  }
  function all() {
    const raw = localStorage.getItem(KEY);
    try { return validateAll(raw === null ? { payment: [], leave: [] } : JSON.parse(raw)); }
    catch (error) { throw new Error(`範本庫無法讀取：${error.message}`); }
  }
  function load(type) { if (!Object.hasOwn(fields, type)) throw new Error('不支援此表單類型。'); return all()[type]; }
  function save(type, title, data, existingId = '') {
    if (typeof title !== 'string' || !title.trim() || title.trim().length > 120) throw new Error('請輸入 1–120 字的範本名稱。');
    const payload = extract(type, data);
    const records = all();
    const existing = records[type].find(record => record.id === existingId);
    if (existingId && !existing) throw new Error('原範本已被刪除，請另存新範本。');
    if (!existing && records[type].length >= LIMIT) throw new Error(`範本庫已滿（${LIMIT} 筆），請先刪除舊範本。`);
    if (records[type].some(record => record.title === title.trim() && record.id !== existingId)) throw new Error('此範本名稱已存在，請修改名稱或編輯原範本。');
    const now = new Date().toISOString();
    const record = { id: existingId || 't_' + crypto.randomUUID(), title: title.trim(), createdAt: existing?.createdAt || now, updatedAt: now, data: payload };
    records[type] = [record, ...records[type].filter(item => item.id !== record.id)];
    localStorage.setItem(KEY, JSON.stringify(records));
    return record;
  }
  function rename(type, id, title) {
    const record = load(type).find(item => item.id === id);
    if (!record) throw new Error('找不到這筆範本。');
    return save(type, title, record.data, id);
  }
  function remove(type, id) {
    const records = all(); records[type] = records[type].filter(record => record.id !== id);
    localStorage.setItem(KEY, JSON.stringify(records));
  }
  function merge(current, incoming) {
    const result = validateAll(current);
    const imported = validateAll(incoming);
    Object.keys(fields).forEach(type => {
      imported[type].forEach(record => {
        if (result[type].some(item => item.title === record.title)) return;
        result[type].push({ ...record, id: result[type].some(item => item.id === record.id) ? 't_' + crypto.randomUUID() : record.id });
      });
    });
    return validateAll(result);
  }
  return { KEY, LIMIT, extract, validateAll, load, save, rename, remove, merge };
})();
