/* Only known form types are stored; links always come from this local catalog. */
const FormShortcuts = (() => {
  const FAVORITES_KEY = 'hr_form_favorites';
  const RECENT_KEY = 'hr_form_usage';
  const FORMS = [
    ['leave', 'leave_request', '請假單'], ['payment', 'payment_request', '請款單'],
    ['overtime', 'overtime_request', '加班申請單'], ['travel', 'travel_request', '出差申請單'],
    ['purchase', 'purchase_request', '採購申請單'], ['receipt', 'receipt', '免用統一發票收據'],
    ['simple_receipt', 'simple_receipt', '簡便式收據'], ['expense', 'expense_certificate', '支出證明單'],
    ['outing', 'outing_request', '公出申請單'], ['petty_cash', 'petty_cash_request', '零用金申請單'],
    ['supply', 'supply_requisition', '物品領用單'], ['acceptance', 'purchase_acceptance', '採購驗收單'],
  ].map(([type, slug, label]) => ({ type, path: `forms/${slug}_form.html`, label }));
  const formOf = type => FORMS.find(form => form.type === type);
  function read(key) {
    try {
      const records = JSON.parse(localStorage.getItem(key) ?? '[]');
      if (!Array.isArray(records)) throw new Error();
      return records;
    } catch { throw new Error('無法讀取快捷資料，請檢查瀏覽器的網站儲存空間。'); }
  }
  function favorites() {
    const records = read(FAVORITES_KEY);
    if (records.some(type => typeof type !== 'string' || !formOf(type))) throw new Error('收藏資料格式不正確。');
    return [...new Set(records)];
  }
  function toggleFavorite(type) {
    if (!formOf(type)) throw new Error('不支援此表單。');
    const records = favorites();
    const next = records.includes(type) ? records.filter(item => item !== type) : [...records, type];
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next));
    return next;
  }
  function recent() {
    const records = read(RECENT_KEY);
    if (records.some(record => !record || !formOf(record.type) || typeof record.usedAt !== 'string' || !Number.isFinite(Date.parse(record.usedAt)))) throw new Error('最近使用資料格式不正確。');
    const seen = new Set();
    return records.sort((a, b) => Date.parse(b.usedAt) - Date.parse(a.usedAt)).filter(record => {
      if (seen.has(record.type)) return false;
      seen.add(record.type); return true;
    }).slice(0, FORMS.length);
  }
  function visit(type) {
    if (!formOf(type)) throw new Error('不支援此表單。');
    const records = [{ type, usedAt: new Date().toISOString() }, ...recent().filter(record => record.type !== type)].slice(0, FORMS.length);
    localStorage.setItem(RECENT_KEY, JSON.stringify(records));
  }
  if (typeof document !== 'undefined') document.addEventListener('DOMContentLoaded', () => {
    const form = FORMS.find(item => location.pathname.endsWith(`/${item.path}`));
    if (form) { try { visit(form.type); } catch { /* Storage restrictions must not interrupt filling a form. */ } }
  });
  return { FORMS, FAVORITES_KEY, RECENT_KEY, formOf, favorites, toggleFavorite, recent, visit };
})();
