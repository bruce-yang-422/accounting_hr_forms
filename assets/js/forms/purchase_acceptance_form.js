(() => {
  const { value, text, setValues } = FormPage;
  const { field, number, activeRows, tablePreview } = OperationalForms;
  const columns = ['Name', 'Spec', 'Ordered', 'Received', 'Accepted', 'Unit'];
  const rows = () => activeRows(columns);
  const qty = (n, key) => Number(value(field(n, key)));
  const complete = () => rows().length > 0 && rows().every(n => value(field(n, 'Name')) && value(field(n, 'Unit')) &&
    number(field(n, 'Ordered'), 0.001) && number(field(n, 'Received')) && number(field(n, 'Accepted')) && qty(n, 'Accepted') <= qty(n, 'Received'));
  const discrepancy = () => rows().some(n => qty(n, 'Ordered') !== qty(n, 'Received') || qty(n, 'Received') !== qty(n, 'Accepted'));
  const resultValid = () => complete() && (
    value('result') === '合格' ? !discrepancy() :
      value('result') === '部分合格' ? discrepancy() && rows().some(n => qty(n, 'Accepted') > 0) :
        value('result') === '不合格' && rows().every(n => qty(n, 'Accepted') === 0));
  OperationalForms.setup({
    type: 'acceptance', label: '採購驗收單',
    title: () => [value('supplier') || '未填供應商', value('orderNo') || '未填採購單號', value('inspectionDate')].join('｜'),
    summaryFields: [['supplier', '供應商'], ['orderNo', '採購單號'], ['inspectionDate', '驗收日期'], ['result', '驗收結果'], ['issueReason', '異常說明']],
    sections: [
      [{ id: 'supplier', label: '供應商' }, { id: 'orderNo', label: '採購單號' },
        { ok: () => OperationalForms.date('inspectionDate'), label: '請填寫有效的驗收日期' }, { id: 'location', label: '驗收地點' }],
      [{ ok: complete, label: '至少填寫一筆品項；名稱、單位與訂購／實收／合格數量須完整，合格數量不得超過實收數量' }],
      [{ ok: resultValid, label: '驗收結果須與數量相符；合格須全數到貨且合格，不合格的合格數量須為零' },
        { id: 'issueReason', label: '數量差異或不合格時須填寫異常與處理說明', when: () => value('result') !== '合格' || discrepancy() }],
    ],
    preview() {
      tablePreview(columns);
      ['supplier', 'orderNo', 'location', 'result', 'issueReason'].forEach(id => text(`pv-${id}`, value(id)));
      text('pv-inspectionDate', FormCalc.slashDate(value('inspectionDate')));
    },
    sample() {
      setValues({ applicant: '陳小華', department: '總務部', supplier: '文具供應商', orderNo: 'PO-2026-0012',
        inspectionDate: FormCalc.localDate(), location: '辦公室收貨區', reason: '依訂單核對規格、外觀與數量', result: '合格',
        item1Name: '影印紙', item1Spec: 'A4 80gsm', item1Ordered: '10', item1Received: '10', item1Accepted: '10', item1Unit: '包' });
    },
  });
})();
