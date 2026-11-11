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
      summaryFields: [['applicant', '填單人'], ['department', '單位'], ['reqDate', '申請日期'], ['reason', '事由'], ...(config.summaryFields || [])],
      sections: [
        [{ id: 'applicant', label: '填單人' }, { id: 'department', label: '單位' },
          { ok: () => date('reqDate'), label: '請填寫有效的申請日期' }],
        ...config.sections,
      ],
      preview() {
        ['applicant', 'department', 'jobTitle', 'reason', 'remark'].forEach(id => text(`pv-${id}`, value(id)));
        config.preview();
      },
    });
  }
  return { indexes, field, number, date, activeRows, tablePreview, setup };
})();
