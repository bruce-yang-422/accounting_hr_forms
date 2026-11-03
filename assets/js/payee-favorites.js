/* Saved recipients are separate from applicant profiles and form drafts. */
(() => {
  const picker = document.getElementById('payeeFavorite');
  const saveButton = document.getElementById('savePayeeFavorite');
  const deleteButton = document.getElementById('deletePayeeFavorite');
  const status = document.getElementById('payeeFavoriteStatus');
  const textFields = ['payee', 'taxId', 'bankName', 'bankBranch', 'bankAccount'];
  const types = PayeeStore.typeLabels;
  const methods = PayeeStore.methodLabels;

  function load() {
    return PayeeStore.getAll();
  }

  function render(records, selected = '') {
    picker.replaceChildren(new Option(records.length ? '選擇常用付款對象' : '尚無常用名單，填寫後可儲存', ''));
    records.forEach(record => {
      const label = [record.payee, types[record.payeeType], methods[record.payMethod],
        record.payMethod === 'transfer' ? record.bankName : ''].filter(Boolean).join('｜');
      picker.add(new Option(label, record.id));
    });
    picker.value = selected;
    deleteButton.disabled = !picker.value;
  }

  function reportError() {
    status.textContent = '無法讀取或儲存常用名單，請確認瀏覽器允許本機儲存。';
  }

  picker.addEventListener('change', () => {
    deleteButton.disabled = !picker.value;
    if (!picker.value) return;
    try {
      const record = load().find(item => item.id === picker.value);
      if (!record) {
        render(load());
        status.textContent = '這筆資料已不存在，請重新選取。';
        return;
      }
      // Update conditional fields first, as radio handlers can clear their values.
      setRadio('payeeType', record.payeeType);
      setRadio('payMethod', record.payMethod);
      textFields.forEach(id => {
        const applicable = id === 'taxId' ? record.payeeType !== 'employee' :
          !id.startsWith('bank') || record.payMethod === 'transfer';
        const field = document.getElementById(id);
        field.value = applicable && typeof record[id] === 'string' ? record[id] : '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      });
      picker.value = record.id;
      deleteButton.disabled = false;
      status.textContent = `已帶入「${record.payee}」。修改後按「儲存為常用」可更新同名資料。`;
    } catch {
      reportError();
    }
  });

  saveButton.addEventListener('click', () => {
    const record = Object.fromEntries(textFields.map(id => [id, gv(id)]));
    record.payeeType = gr('payeeType');
    record.payMethod = gr('payMethod');
    const missing = [];
    if (!record.payee) missing.push('付款對象（戶名）');
    if (!record.payeeType) missing.push('受款方身分');
    if (!record.payMethod) missing.push('付款方式');
    if (record.payMethod === 'transfer') {
      if (!record.bankName) missing.push('匯款銀行');
      if (!record.bankAccount) missing.push('匯款帳號');
    } else {
      record.bankName = record.bankBranch = record.bankAccount = '';
    }
    if (record.payeeType === 'employee') record.taxId = '';
    if (missing.length) {
      status.textContent = '儲存常用名單前，請填寫：' + missing.join('、') + '。';
      return;
    }
    try {
      const records = load();
      const index = records.findIndex(item => item.payee === record.payee);
      if (index !== -1 && !confirm(`「${record.payee}」已在常用名單中，確定更新付款資料？`)) return;
      const saved = PayeeStore.save(record, index === -1 ? '' : records[index].id);
      render(load(), saved.id);
      status.textContent = `已${index === -1 ? '儲存' : '更新'}「${record.payee}」的常用付款資料。`;
    } catch {
      reportError();
    }
  });

  deleteButton.addEventListener('click', () => {
    try {
      const records = load();
      const record = records.find(item => item.id === picker.value);
      if (!record || !confirm(`確定從常用名單刪除「${record.payee}」？`)) return;
      PayeeStore.remove(record.id);
      render(load());
      status.textContent = `已刪除「${record.payee}」，目前表單內容保留。`;
    } catch {
      reportError();
    }
  });

  // Clearing or restoring a form must not leave a different recipient selected.
  function resetSelection() {
    picker.value = '';
    deleteButton.disabled = true;
  }
  textFields.forEach(id => document.getElementById(id).addEventListener('input', resetSelection));
  document.querySelectorAll('input[name="payeeType"], input[name="payMethod"]').forEach(input => {
    input.addEventListener('change', resetSelection);
  });
  window.PayeeFavorites = { resetSelection };

  window.addEventListener('storage', event => {
    if (event.key === null || event.key === PayeeStore.KEY) {
      try {
        render(load());
        status.textContent = '常用名單已更新，目前填寫內容保留；可重新選取付款對象。';
      } catch { reportError(); }
    }
  });

  try {
    render(load());
  } catch {
    reportError();
  }
})();
