(() => {
  const { byId, value, text, setValues } = FormPage;
  const period = () => {
    const [startHour = '', startMinute = ''] = value('startTime').split(':');
    const [endHour = '', endMinute = ''] = value('endTime').split(':');
    return FormCalc.periodMinutes({ startDate: value('outingDate'), endDate: value('outingDate'), startHour, startMinute, endHour, endMinute });
  };
  const duration = () => period().minutes ? FormCalc.hoursText(period().minutes) : '';
  OperationalForms.setup({
    type: 'outing', label: '公出申請單',
    title: () => [value('applicant') || '未填申請人', value('destination') || '未填地點', value('outingDate')].join('｜'),
    summaryFields: [['outingDate', '公出日期'], ['destination', '公出地點'], ['visitTarget', '洽辦對象']],
    sections: [
      [{ ok: () => OperationalForms.date('outingDate'), label: '請填寫有效的公出日期' },
        { id: 'destination', label: '公出地點' }, { id: 'reason', label: '公出事由' },
        { ok: () => byId('startTime').validity.valid && byId('endTime').validity.valid && !!period().minutes && !period().invalid,
          label: '請填寫同日的起訖時間，結束時間須晚於開始時間' }],
      [{ id: 'contactPhone', label: '聯絡電話' }],
    ],
    refresh() { byId('duration').value = duration(); },
    preview() {
      ['destination', 'visitTarget', 'contactPhone', 'agent', 'transport'].forEach(id => text(`pv-${id}`, value(id)));
      text('pv-period', [FormCalc.slashDate(value('outingDate')), `${value('startTime')} 至 ${value('endTime')}`, duration()].filter(Boolean).join('　'));
    },
    sample() {
      setValues({ applicant: '陳小華', department: '行政部', jobTitle: '專員', outingDate: FormCalc.localDate(),
        startTime: '09:00', endTime: '11:30', destination: '臺北市中正區合作廠商辦公室', visitTarget: '業務窗口林先生',
        reason: '洽談設備維護事宜並送交文件', transport: '大眾運輸', agent: '林小安', contactPhone: '0912-345-678' });
    },
  });
})();
