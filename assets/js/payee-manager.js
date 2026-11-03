document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('payee-manager-form');
  const list = document.getElementById('payee-manager-list');
  const search = document.getElementById('payee-search');
  const status = document.getElementById('payee-manager-status');
  const title = document.getElementById('payee-form-title');
  const submit = document.getElementById('payee-submit');
  const cancel = document.getElementById('payee-cancel');
  const fields = Object.fromEntries(Object.entries({ payee: 'payee-name', payeeType: 'payee-type', payMethod: 'payee-method',
    taxId: 'payee-tax-id', bankName: 'payee-bank', bankBranch: 'payee-branch', bankAccount: 'payee-account' }).map(([key, id]) => [key, document.getElementById(id)]));
  let editingId = '';

  function node(tag, className, text) {
    const element = document.createElement(tag);
    element.className = className;
    element.textContent = text;
    return element;
  }
  function button(text, className, action) {
    const element = node('button', className, text);
    element.type = 'button';
    element.addEventListener('click', action);
    return element;
  }
  function fail(error) {
    status.textContent = `操作未完成：${error.message || '請確認瀏覽器儲存空間與權限。'}`;
  }
  function syncFields() {
    const isEmployee = fields.payeeType.value === 'employee';
    const isTransfer = fields.payMethod.value === 'transfer';
    document.getElementById('payee-tax-group').hidden = isEmployee;
    fields.taxId.disabled = isEmployee;
    document.getElementById('payee-tax-label').textContent = fields.payeeType.value === 'person' ? '身分證字號（選填）' : '統一編號（選填）';
    fields.taxId.placeholder = fields.payeeType.value === 'person' ? '身分證字號' : '8 碼統一編號';
    document.getElementById('payee-bank-group').hidden = !isTransfer;
    [fields.bankName, fields.bankBranch, fields.bankAccount].forEach(field => { field.disabled = !isTransfer; });
    fields.bankName.required = fields.bankAccount.required = isTransfer;
  }
  function resetForm(focus = false) {
    editingId = '';
    form.reset();
    title.textContent = submit.textContent = '新增付款對象';
    cancel.hidden = true;
    syncFields();
    if (focus) fields.payee.focus();
  }
  function edit(id) {
    try {
      const record = PayeeStore.getAll().find(item => item.id === id);
      if (!record) throw new Error('這筆資料已被刪除，請重新選取。');
      editingId = id;
      Object.entries(fields).forEach(([key, field]) => { field.value = record[key]; });
      title.textContent = `編輯付款對象：${record.payee}`;
      submit.textContent = '儲存變更';
      cancel.hidden = false;
      syncFields();
      fields.payee.focus();
      form.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      status.textContent = '正在編輯付款資料，儲存後請款單常用名單會同步更新。';
    } catch (error) { fail(error); }
  }
  function render() {
    list.replaceChildren();
    try {
      const records = PayeeStore.getAll();
      const query = search.value.trim().toLowerCase();
      const filtered = records.filter(record => [record.payee, PayeeStore.typeLabels[record.payeeType], PayeeStore.methodLabels[record.payMethod],
        record.bankName, record.bankBranch, record.bankAccount, record.taxId].join(' ').toLowerCase().includes(query));
      document.getElementById('payee-count').textContent = query ? `找到 ${filtered.length} 筆，共 ${records.length} 筆付款對象` : `共 ${records.length} 筆付款對象`;
      if (!filtered.length) list.append(node('p', 'payee-manager-empty', records.length ? '沒有符合的付款對象，請換個關鍵字。' : '尚無常用付款對象，可在下方新增，也可從請款單儲存。'));
      filtered.forEach(record => {
        const card = node('article', 'pm-card payee-manager-card', '');
        const info = node('div', 'pm-card-info', '');
        info.append(node('h3', 'pm-card-name', record.payee), node('p', 'pm-card-meta',
          [PayeeStore.typeLabels[record.payeeType], PayeeStore.methodLabels[record.payMethod], record.bankName, record.bankBranch].filter(Boolean).join('・')));
        const details = node('details', 'payee-manager-details', '');
        details.append(node('summary', '', '查看付款資料'));
        if (record.taxId) details.append(node('p', '', `${record.payeeType === 'person' ? '身分證字號' : '統一編號'}：${record.taxId}`));
        if (record.payMethod === 'transfer') details.append(node('p', '', `匯款銀行：${[record.bankName, record.bankBranch].filter(Boolean).join('・')}`), node('p', '', `帳號：${record.bankAccount}`));
        if (!record.taxId && record.payMethod !== 'transfer') details.append(node('p', '', `付款方式：${PayeeStore.methodLabels[record.payMethod]}`));
        info.append(details);
        const actions = node('div', 'pm-card-actions', '');
        const confirmation = node('div', 'payee-delete-confirm', '');
        actions.append(button('編輯', 'pm-btn pm-btn--edit', () => edit(record.id)), button('刪除', 'pm-btn pm-btn--del', () => {
          confirmation.replaceChildren(node('p', '', `確定刪除「${record.payee}」？刪除後無法復原，已填寫的請款單內容仍會保留。`),
            button('確定刪除', 'pm-btn pm-btn--del', () => {
              try {
                PayeeStore.remove(record.id);
                if (editingId === record.id) resetForm();
                render(); status.textContent = `已刪除「${record.payee}」。`;
                search.focus();
              } catch (error) { fail(error); }
            }), button('取消', 'pm-btn pm-btn--edit', () => confirmation.replaceChildren()));
        }));
        card.append(info, actions, confirmation);
        list.append(card);
      });
      return true;
    } catch (error) {
      document.getElementById('payee-count').textContent = '名單暫時無法讀取';
      fail(error);
      return false;
    }
  }

  fields.payeeType.addEventListener('change', syncFields);
  fields.payMethod.addEventListener('change', syncFields);
  search.addEventListener('input', render);
  document.getElementById('payee-new').addEventListener('click', () => { resetForm(true); status.textContent = '可填寫新的付款對象資料。'; });
  cancel.addEventListener('click', () => { resetForm(true); status.textContent = '已取消編輯，原有資料保留。'; });
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const wasEditing = Boolean(editingId);
      const record = PayeeStore.save(Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])), editingId);
      resetForm(); render();
      status.textContent = `已${wasEditing ? '更新' : '新增'}「${record.payee}」。請款單選取此對象即可帶入付款資料。`;
      fields.payee.focus();
    } catch (error) { fail(error); }
  });
  window.addEventListener('favorites-imported', () => { resetForm(); render(); status.textContent = '已重新載入匯入的付款對象名單。'; });
  window.addEventListener('storage', event => {
    if ((event.key === null || event.key === PayeeStore.KEY) && render()) status.textContent = '其他分頁已更新名單，正在編輯的內容保留，儲存前請確認。';
  });
  resetForm(); render();
});
