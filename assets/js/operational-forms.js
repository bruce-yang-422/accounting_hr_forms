/* Shared fields and fixed five-line item tables for everyday administrative forms. */
const OperationalForms = (() => {
  const { byId, value, text } = FormPage;
  const indexes = [1, 2, 3, 4, 5];
  const field = (n, name) => `item${n}${name}`;
  const number = (id, minimum = 0) => value(id) !== '' && byId(id).validity.valid &&
    Number.isFinite(Number(value(id))) && Number(value(id)) >= minimum;
  const date = id => value(id) !== '' && byId(id).validity.valid && !!FormCalc.parseDate(value(id));
  const activeRows = columns => indexes.filter(n => columns.some(name => value(field(n, name))));
  const tablePreview = columns => indexes.forEach(n => columns.forEach(name => text(`pv-${field(n, name)}`, value(field(n, name)))));

  function setup(config) {
    FormPage.setup({
      ...config,
      summaryFields: [['applicant', '填單人'], ['department', '單位'], ['reqDate', '申請日期'], ['reason', '事由'], ...(config.summaryFields || []),
        ['reviewer', '審核人'], ['reviewDate', '審核日期'], ['reviewStatus', '審核結果'], ['reviewComment', '審核意見']],
      sections: [
        [{ id: 'applicant', label: '填單人' }, { id: 'department', label: '單位' },
          { ok: () => date('reqDate'), label: '請填寫有效的申請日期' }],
        ...config.sections,
        [
          { ok: () => ['', '同意', '退回'].includes(value('reviewStatus')), label: '請選擇有效的審核結果' },
          { id: 'reviewer', label: '已審核時須填寫審核人', when: () => !!value('reviewStatus') },
          { ok: () => date('reviewDate'), label: '已審核時須填寫有效的審核日期', when: () => !!value('reviewStatus') },
          { ok: () => !value('reviewDate') || date('reviewDate'), label: '審核日期格式不正確' },
          { id: 'reviewComment', label: '退回時須填寫審核意見', when: () => value('reviewStatus') === '退回' },
        ],
      ],
      preview() {
        ['applicant', 'department', 'jobTitle', 'reason', 'remark', 'reviewer', 'reviewStatus', 'reviewComment'].forEach(id => text(`pv-${id}`, value(id)));
        text('pv-reviewDate', FormCalc.slashDate(value('reviewDate')));
        config.preview();
      },
    });
  }
  return { indexes, field, number, date, activeRows, tablePreview, setup };
})();
