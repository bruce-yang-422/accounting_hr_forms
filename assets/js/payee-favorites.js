/* Payment recipients share a searchable picker and the dedicated management page. */
(() => {
  const chooseButton = document.getElementById('payeeFavorite');
  const saveButton = document.getElementById('savePayeeFavorite');
  const status = document.getElementById('payeeFavoriteStatus');
  const textFields = ['payee', 'taxId', 'bankName', 'bankBranch', 'bankAccount'];
  const types = PayeeStore.typeLabels;
  const methods = PayeeStore.methodLabels;
  function reportError(error) { status.textContent = `無法讀取或儲存常用名單：${error.message}`; }
  function resetSelection() { chooseButton.textContent = '選擇常用付款對象'; }
  function apply(record) {
    const latest = PayeeStore.getAll().find(item => item.id === record.id);
    if (!latest) throw new Error('這筆資料已被刪除，請重新搜尋。');
    setRadio('payeeType', latest.payeeType); setRadio('payMethod', latest.payMethod);
    textFields.forEach(id => {
      const field = document.getElementById(id); field.value = latest[id] || '';
      field.dispatchEvent(new Event('input', { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    });
    chooseButton.textContent = '更換常用付款對象';
    status.textContent = `已帶入「${latest.payee}」的付款資料。`;
  }
  const picker = FavoritesUI.picker({
    title: '選擇常用付款對象', manageUrl: '../favorites.html#payee-manager', load: PayeeStore.getAll,
    name: record => record.payee, placeholder: '搜尋戶名、銀行、帳號或統編',
    searchText: record => [...Object.values(record), types[record.payeeType], methods[record.payMethod]].join(' '),
    description: record => [types[record.payeeType], methods[record.payMethod], record.bankName, record.bankAccount ? `帳號末碼 ${record.bankAccount.slice(-5)}` : ''].filter(Boolean).join('・'),
    filters: [{ label: '身分', value: record => record.payeeType, options: Object.entries(types) },
      { label: '付款方式', value: record => record.payMethod, options: Object.entries(methods) }],
    onSelect: apply,
  });
  chooseButton.addEventListener('click', picker.open);
  saveButton.addEventListener('click', () => {
    const record = Object.fromEntries(textFields.map(id => [id, gv(id)]));
    record.payeeType = gr('payeeType'); record.payMethod = gr('payMethod');
    try {
      const existing = PayeeStore.getAll().find(item => item.payee === record.payee);
      if (existing && !confirm(`「${record.payee}」已在常用名單中，確定更新付款資料？`)) return;
      PayeeStore.save(record, existing?.id || '');
      status.textContent = `已${existing ? '更新' : '儲存'}「${record.payee}」的常用付款資料。`;
    } catch (error) { reportError(error); }
  });
  textFields.forEach(id => document.getElementById(id).addEventListener('input', resetSelection));
  document.querySelectorAll('input[name="payeeType"], input[name="payMethod"]').forEach(input => input.addEventListener('change', resetSelection));
  window.PayeeFavorites = { resetSelection };
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === PayeeStore.KEY) {
      picker.refresh(); status.textContent = '常用名單已更新，目前填寫內容保留；可重新選取付款對象。';
    }
  });
})();
