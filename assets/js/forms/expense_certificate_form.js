(() => {
  const { byId, value, text, setValues } = FormPage;
  const amount = () => Number(value('amount'));
  const validAmount = () => value('amount') !== '' && byId('amount').validity.valid &&
    Number.isFinite(amount()) && amount() > 0 && amount() < 1e12;

  FormPage.setup({
    type: 'expense', label: '支出證明單',
    title: () => [value('acctCategory') || '未填科目', value('reason') || '未填事由',
      validAmount() ? `NT$ ${amount().toLocaleString('zh-TW')}` : '未填金額', value('reqDate')].join('｜'),
    summaryFields: [['reqDate', '開立日期'], ['acctCategory', '科目'], ['reason', '事由'], ['noVoucherReason', '不能取得單據原因'], ['amount', '金額']],
    sections: [
      [{ id: 'reqDate', label: '開立日期' }, { ok: () => byId('reqDate').validity.valid, label: '開立日期格式不正確' },
        { id: 'acctCategory', label: '科目' }, { id: 'reason', label: '事由' }],
      [{ id: 'noVoucherReason', label: '不能取得單據原因' }],
      [{ ok: validAmount, label: '支出金額須大於零、小於一兆元，且最多兩位小數' }],
    ],
    refresh() { byId('amountChinese').value = validAmount() ? numToChinese(amount()) : ''; },
    preview() {
      const [year, month, day] = value('reqDate').split('-').map(Number);
      text('pv-date', value('reqDate') ? `中華民國 ${year - 1911} 年 ${month} 月 ${day} 日` : '');
      ['acctCategory', 'reason', 'noVoucherReason'].forEach(id => text(`pv-${id}`, value(id)));
      const digits = validAmount() ? FormCalc.amountUnits(amount()) : null;
      byId('ev-money-units').hidden = !digits;
      byId('ev-money-text').hidden = !!digits;
      Array.from({ length: 6 }, (_, i) => text(`pv-digit-${i}`, digits?.[i] || ''));
      text('pv-amountChinese', byId('amountChinese').value);
      text('pv-amount', validAmount() ? `NT$ ${amount().toLocaleString('zh-TW', { maximumFractionDigits: 2 })}` : '');
    },
    sample() {
      setValues({ acctCategory: '交通費', reason: '臨時搬運辦公用品所需交通費',
        noVoucherReason: '現場臨時支出，未能取得收據，據實填寫本單。', amount: '1500' });
    },
  });
})();
