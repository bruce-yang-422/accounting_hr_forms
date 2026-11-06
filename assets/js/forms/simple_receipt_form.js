(() => {
  const { byId, value, radio, text, setValues, pick } = FormPage;
  const amount = () => Number(value('amount'));
  const validAmount = () => value('amount') !== '' && byId('amount').validity.valid &&
    Number.isFinite(amount()) && amount() > 0 && amount() < 1e12;
  const methodLabels = { cash: '現金', transfer: '匯款／轉帳', other: '其他' };

  FormPage.setup({
    type: 'simple_receipt', label: '簡便式收據',
    title: () => [value('payer') || '未填付款人', validAmount() ? `NT$ ${amount().toLocaleString('zh-TW')}` : '未填金額', value('reqDate'), value('docNo')].filter(Boolean).join('｜'),
    summaryFields: [['payer', '付款人'], ['recipient', '收款人'], ['reqDate', '收款日期'], ['amount', '收到款項'], ['reason', '款項說明']],
    sections: [
      [{ id: 'reqDate', label: '收款日期' }, { ok: () => byId('reqDate').validity.valid, label: '收款日期格式不正確' },
        { id: 'payer', label: '付款人姓名／單位' },
        { ok: validAmount, label: '收到款項須大於零、小於一兆元，且最多兩位小數' }],
      [{ ok: () => Object.hasOwn(methodLabels, radio('payMethod')), label: '付款方式' },
        { id: 'methodOther', label: '其他付款方式', when: () => radio('payMethod') === 'other' },
        { ok: () => !value('bankAccount') || /^[\d\s-]+$/.test(value('bankAccount')), label: '帳號請使用數字，可包含空格或連字號', when: () => radio('payMethod') === 'transfer' },
        { id: 'reason', label: '款項說明' }],
      [{ id: 'recipient', label: '收款人姓名／單位' }],
    ],
    refresh() {
      byId('amountChinese').value = validAmount() ? numToChinese(amount()) : '';
    },
    preview() {
      const [year, month, day] = value('reqDate').split('-').map(Number);
      text('pv-date', value('reqDate') ? `中華民國 ${year - 1911} 年 ${month} 月 ${day} 日` : '中華民國　　　 年　　 月　　 日');
      text('pv-amount', validAmount() ? amount().toLocaleString('zh-TW', { maximumFractionDigits: 2 }) : '');
      text('pv-amountChinese', byId('amountChinese').value);
      ['payer', 'reason', 'recipient', 'contactPhone'].forEach(id => text(`pv-${id}`, value(id)));
      const method = radio('payMethod');
      Object.keys(methodLabels).forEach(key => { byId(`pv-check-${key}`).style.display = method === key ? '' : 'none'; });
      text('pv-methodLabel', methodLabels[method]);
      byId('pv-transfer').hidden = method !== 'transfer';
      text('pv-bankName', method === 'transfer' ? value('bankName') : '');
      text('pv-bankBranch', method === 'transfer' ? value('bankBranch') : '');
      text('pv-bankAccount', method === 'transfer' ? value('bankAccount') : '');
      const legacyAccountLast5 = method === 'transfer' ? value('accountLast5') : '';
      byId('pv-legacyAccount').hidden = !!value('bankAccount') || !legacyAccountLast5;
      text('pv-legacyAccount', legacyAccountLast5 ? `舊紀錄帳號末五碼：${legacyAccountLast5}` : '');
      byId('pv-other').hidden = method !== 'other';
      text('pv-other', method === 'other' ? value('methodOther') : '');
    },
    sample() {
      setValues({ payer: '林小明', amount: '1500', reason: '二手書籍轉讓款，已全額收訖。', recipient: '陳小華', contactPhone: '0912-345-678' });
      pick('payMethod', 'cash');
    },
  });
})();
