document.addEventListener('DOMContentLoaded', () => {
  const { node, button } = FavoritesUI;
  const form = document.getElementById('payee-manager-form');
  const status = document.getElementById('payee-manager-status');
  const formStatus = document.getElementById('payee-form-status');
  const fields = Object.fromEntries(Object.entries({ payee: 'payee-name', payeeType: 'payee-type', payMethod: 'payee-method',
    taxId: 'payee-tax-id', bankName: 'payee-bank', bankBranch: 'payee-branch', bankAccount: 'payee-account' }).map(([key, id]) => [key, document.getElementById(id)]));
  const editor = FavoritesUI.editor(form, '新增付款對象'); form.hidden = false;
  document.getElementById('payee-form-title').hidden = true;
  const cancel = document.getElementById('payee-cancel'); cancel.hidden = false; cancel.textContent = '取消';
  let editingId = '';
  function fail(error) { (editor.dialog.open ? formStatus : status).textContent = `操作未完成：${error.message}`; }
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
  function openEditor(record) {
    form.reset(); formStatus.textContent = ''; editingId = record?.id || '';
    if (record) Object.entries(fields).forEach(([key, field]) => { field.value = record[key]; });
    document.getElementById('payee-submit').textContent = record ? '儲存變更' : '新增付款對象';
    syncFields(); editor.open(record ? `編輯付款對象：${record.payee}` : '新增付款對象');
  }
  const browser = FavoritesUI.createBrowser(document.getElementById('payee-browser'), {
    placeholder: '輸入戶名、銀行、帳號或統編，搜尋全部付款對象',
    name: record => record.payee,
    searchText: record => [...Object.values(record), PayeeStore.typeLabels[record.payeeType], PayeeStore.methodLabels[record.payMethod]].join(' '),
    filters: [{ label: '身分', value: record => record.payeeType, options: Object.entries(PayeeStore.typeLabels) },
      { label: '付款方式', value: record => record.payMethod, options: Object.entries(PayeeStore.methodLabels) }],
    emptyTitle: '還沒有常用付款對象', emptyText: '在這裡新增，或從請款單儲存付款資料。',
    createLabel: '新增付款對象', onCreate: () => openEditor(),
    renderItem(record) {
      const card = node('article', 'fm-record');
      const info = node('div', 'fm-record-info');
      info.append(node('h3', '', record.payee), node('p', '', [PayeeStore.typeLabels[record.payeeType], PayeeStore.methodLabels[record.payMethod], record.bankName].filter(Boolean).join('・')));
      const details = node('details'); details.append(node('summary', '', '查看完整付款資料'));
      if (record.taxId) details.append(node('p', '', `${record.payeeType === 'person' ? '身分證字號' : '統一編號'}：${record.taxId}`));
      if (record.payMethod === 'transfer') details.append(node('p', '', `銀行：${[record.bankName, record.bankBranch].filter(Boolean).join('・')}　帳號：${record.bankAccount}`));
      else details.append(node('p', '', `付款方式：${PayeeStore.methodLabels[record.payMethod]}`));
      info.append(details);
      const actions = node('div', 'fm-record-actions'); const confirmation = node('div', 'fm-confirm');
      actions.append(button('編輯', () => {
        try {
          const latest = PayeeStore.getAll().find(item => item.id === record.id);
          if (!latest) throw new Error('這筆資料已被刪除，請重新選取。');
          openEditor(latest);
        } catch (error) { fail(error); }
      }), button('刪除', () => {
        confirmation.replaceChildren(node('p', '', `確定刪除「${record.payee}」？已填寫的請款單內容會保留。`),
          button('確定刪除', () => {
            try { PayeeStore.remove(record.id); refresh(); status.textContent = `已刪除「${record.payee}」。`; } catch (error) { fail(error); }
          }, 'fm-button fm-danger'), button('取消', () => confirmation.replaceChildren()));
      }, 'fm-button fm-danger'));
      card.append(info, actions, confirmation); return card;
    },
  });
  function refresh() { try { browser.setRecords(PayeeStore.getAll()); } catch (error) { fail(error); } }
  fields.payeeType.addEventListener('change', syncFields);
  fields.payMethod.addEventListener('change', syncFields);
  document.getElementById('payee-new').addEventListener('click', () => openEditor());
  cancel.addEventListener('click', editor.requestClose);
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const record = PayeeStore.save(Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value])), editingId);
      editor.close(); refresh(); browser.reveal(record);
      status.textContent = `已${editingId ? '更新' : '新增'}「${record.payee}」。請款單可選取帶入付款資料。`;
    } catch (error) { fail(error); }
  });
  window.addEventListener('favorites-imported', refresh);
  window.addEventListener('storage', event => { if (event.key === null || event.key === PayeeStore.KEY) refresh(); });
  refresh();
});
