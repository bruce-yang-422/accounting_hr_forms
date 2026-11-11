(() => {
  const { value, text, setValues } = FormPage;
  const { field, number, activeRows, tablePreview } = OperationalForms;
  const columns = ['Name', 'Spec', 'Qty', 'Unit'];
  OperationalForms.setup({
    type: 'supply', label: '物品領用單',
    title: () => [value('applicant') || '未填領用人', value('reason') || '未填用途', value('neededDate')].join('｜'),
    summaryFields: [['neededDate', '領用日期'], ['warehouse', '領用倉庫']],
    sections: [
      [{ ok: () => OperationalForms.date('neededDate'), label: '請填寫有效的領用日期' }, { id: 'reason', label: '領用用途' }],
      [{ ok: () => activeRows(columns).length > 0 && activeRows(columns).every(n => value(field(n, 'Name')) && number(field(n, 'Qty'), 0.001) && value(field(n, 'Unit'))),
        label: '至少填寫一筆物品；每筆須填名稱、單位及大於零、最多三位小數的數量' }],
    ],
    preview() {
      tablePreview(columns);
      text('pv-neededDate', FormCalc.slashDate(value('neededDate')));
      ['warehouse', 'custodian'].forEach(id => text(`pv-${id}`, value(id)));
    },
    sample() {
      setValues({ applicant: '陳小華', department: '行政部', neededDate: FormCalc.localDate(), warehouse: '總務用品櫃', custodian: '林小安',
        reason: '部門日常行政作業使用', item1Name: '影印紙', item1Spec: 'A4 80gsm', item1Qty: '2', item1Unit: '包',
        item2Name: '原子筆', item2Spec: '黑色', item2Qty: '5', item2Unit: '支' });
    },
  });
})();
