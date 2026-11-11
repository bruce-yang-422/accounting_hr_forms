(() => {
  const { byId, value, text, setValues } = FormPage;
  const { field, number, activeRows, tablePreview } = OperationalForms;
  const columns = ['Name', 'Amount', 'Voucher'];
  const rows = () => activeRows(columns);
  const validRows = () => rows().length > 0 && rows().every(n => value(field(n, 'Name')) && number(field(n, 'Amount'), 0.01));
  const cents = () => rows().reduce((sum, n) => sum + Math.round(Number(value(field(n, 'Amount'))) * 100), 0);
  const validTotal = () => validRows() && Number.isSafeInteger(cents()) && cents() > 0 && cents() < 1e14;
  OperationalForms.setup({
    type: 'petty_cash', label: '零用金申請單',
    title: () => [value('applicant') || '未填申請人', value('reason') || '未填用途', validTotal() ? FormCalc.money(cents() / 100) : '未填金額'].join('｜'),
    summaryFields: [['receiverName', '領款人'], ['cashMode', '申請類型'], ['cashTotal', '合計']],
    sections: [
      [{ id: 'reason', label: '申請用途' }, { id: 'receiverName', label: '領款人' },
        { ok: () => ['預支', '核銷撥付'].includes(value('cashMode')), label: '請選擇申請類型' },
        { ok: () => !value('settleDate') || OperationalForms.date('settleDate'), label: '預計核銷日期格式不正確' }],
      [{ ok: validRows, label: '至少填寫一筆支出項目；每筆須填名稱及大於零、最多兩位小數的金額' },
        { ok: validTotal, label: '零用金合計須大於零且小於一兆元' }],
    ],
    refresh() {
      byId('cashTotal').value = validTotal() ? FormCalc.money(cents() / 100) : '';
      byId('amountChinese').value = validTotal() ? numToChinese(cents() / 100) : '';
    },
    preview() {
      tablePreview(columns);
      ['receiverName', 'cashMode', 'cashTotal', 'amountChinese'].forEach(id => text(`pv-${id}`, value(id)));
      text('pv-settleDate', FormCalc.slashDate(value('settleDate')));
    },
    sample() {
      setValues({ applicant: '陳小華', department: '行政部', cashMode: '預支', receiverName: '陳小華',
        reason: '辦公室日常用品及郵寄支出', item1Name: '文具用品', item1Amount: '350', item2Name: '郵資', item2Amount: '120' });
    },
  });
})();
