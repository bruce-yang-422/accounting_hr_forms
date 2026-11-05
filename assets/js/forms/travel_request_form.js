(() => {
  const { byId, value, radio, checked, choiceLabel, radioLabel, text, setValues, pick } = FormPage;
  const COSTS = ['costTransport', 'costLodging', 'costMeal', 'costOther'];

  const isSameDay = () => radio('tripType') === 'sameDay';
  const isMultiDay = () => radio('tripType') === 'multiDay';
  const trip = () => (isSameDay() ? { days: null, nights: null, invalid: false } : FormCalc.tripDays(value('startDate'), value('endDate')));
  const total = () => COSTS.reduce((sum, id) => sum + (Number(value(id)) || 0), 0);
  const timeText = prefix => {
    const hour = value(`${prefix}Hour`);
    return hour === '' ? '' : `${hour.padStart(2, '0')}:${(value(`${prefix}Minute`) || '0').padStart(2, '0')}`;
  };
  const moment = prefix => [FormCalc.slashDate(value(`${prefix}Date`)), timeText(prefix)].filter(Boolean).join(' ');
  const span = () => FormCalc.periodMinutes({
    startDate: value('startDate'), startHour: value('startHour'), startMinute: value('startMinute') || '0',
    endDate: isSameDay() ? value('startDate') : value('endDate'), endHour: value('endHour'), endMinute: value('endMinute') || '0',
  });
  const durationText = () => {
    if (isSameDay()) return span().minutes ? FormCalc.hoursText(span().minutes) : '';
    const { days, nights } = trip();
    return days ? `${days} 天 ${nights} 夜` : '';
  };
  const periodText = () => (isSameDay() ? `${moment('start')} 至 ${timeText('end')}` : `${moment('start')} 至 ${moment('end')}`);
  const transportText = () => checked('transportModes')
    .map(input => (input.value === 'other' ? value('transportOther') || '其他' : choiceLabel(input))).join('、');

  function refresh() {
    byId('tripDuration').value = durationText();
    text('startDateLabel', isSameDay() ? '出差日期' : '出發日期');
    byId('agentRequired').style.display = isSameDay() ? 'none' : '';
    text('startHourLabel', isSameDay() ? '開始時' : '出發時');
    text('endHourLabel', isSameDay() ? '結束時' : '返回時');
    ['startHourRequired', 'endHourRequired'].forEach(id => { byId(id).style.display = isSameDay() ? '' : 'none'; });
    const sum = total();
    byId('costTotal').value = sum ? FormCalc.money(sum) : '';
    byId('costChinese').value = numToChinese(sum);
    byId('amtBar').style.display = sum ? 'flex' : 'none';
    text('amtBarNum', FormCalc.money(sum));
    text('amtBarZh', numToChinese(sum));
  }

  FormPage.setup({
    type: 'travel',
    label: '出差申請單',
    title: () => [value('applicant') || '未填申請人', value('destination') || '未填地點',
      FormCalc.slashDate(value('startDate') || value('reqDate')) || '未填日期'].join('｜'),
    summaryFields: [['applicant', '申請人'], ['destination', '出差地點'], ['startDate', '出差日期'], ['endDate', '返回日期'], ['reason', '事由'], ['handover', '交接'], ['remark', '備註']],
    sections: [
      [{ id: 'reqDate', label: '申請日期' }, { id: 'applicant', label: '申請人' }, { id: 'department', label: '單位' }],
      [
        { radio: 'travelType', label: '出差類別' }, { id: 'destination', label: '出差地點' },
        { id: 'startDate', label: '出差日期' },
        { id: 'startHour', label: '開始時間', when: isSameDay },
        { id: 'endHour', label: '結束時間', when: isSameDay },
        { ok: () => !span().invalid, label: '結束時間須晚於開始時間', when: () => !trip().invalid },
        { id: 'endDate', label: '返回日期', when: isMultiDay },
        { ok: () => !trip().invalid, label: '返回日期不可早於出發日期' },
        { id: 'reason', label: '出差事由' }, { check: 'transportModes', label: '交通方式' },
        { id: 'transportOther', label: '其他交通方式說明', when: () => checked('transportModes').some(input => input.value === 'other') },
        { radio: 'needLodging', label: '是否需要住宿', when: isMultiDay },
      ],
      [{ id: 'agent', label: '職務代理人', when: isMultiDay }, { id: 'contactPhone', label: '出差聯絡電話' }],
      [
        { radio: 'advanceNeeded', label: '是否預支差旅費' },
        { ok: () => Number(value('advanceAmount')) > 0, label: '預支金額', when: () => radio('advanceNeeded') === 'yes' },
        { ok: () => Number(value('advanceAmount')) <= total(), label: '預支金額不可超過預估費用合計', when: () => radio('advanceNeeded') === 'yes' && Number(value('advanceAmount')) > 0 },
      ],
    ],
    refresh,
    preview() {
      const sum = total();
      const cost = id => (Number(value(id)) ? FormCalc.money(value(id)) : '');
      text('pv-reqdate', FormCalc.slashDate(value('reqDate')));
      text('pv-applicant', value('applicant'));
      text('pv-dept', value('department'));
      text('pv-jobtitle', value('jobTitle'));
      text('pv-employeeid', value('employeeId'));
      text('pv-manager', value('manager'));
      text('pv-traveltype', radioLabel('travelType'));
      text('pv-destination', value('destination'));
      text('pv-visit', value('visitTarget'));
      text('pv-period', periodText());
      text('pv-duration', durationText());
      text('pv-transport', transportText());
      text('pv-lodging', radio('needLodging') === 'yes' ? ['需要', value('lodgingNote')].filter(Boolean).join('：') : '不需要');
      text('pv-agent', value('agent'));
      text('pv-phone', value('contactPhone'));
      text('pv-handover', value('handover'));
      text('pv-reason', value('reason'));
      COSTS.forEach(id => text(`pv-${id}`, cost(id)));
      text('pv-costTotal', sum ? FormCalc.money(sum) : '');
      text('pv-chinese', numToChinese(sum));
      text('pv-advance', radio('advanceNeeded') === 'yes' ? FormCalc.money(value('advanceAmount')) : '不預支');
      text('pv-remark', value('remark'));
    },
    sample() {
      const today = FormCalc.localDate();
      const next = FormCalc.parseDate(today);
      next.setDate(next.getDate() + 1);
      setValues({
        applicant: '陳小華', department: '行銷部', jobTitle: '行銷專員', employeeId: 'EMP0012', manager: '王經理',
        destination: '高雄市前鎮區', visitTarget: '合作經銷商南區門市', startDate: today, startHour: '8', startMinute: '30', endDate: FormCalc.localDate(next), endHour: '17', endMinute: '0',
        reason: '拜訪南區經銷商，確認下一季促銷活動與陳列安排', lodgingNote: '高雄市區商務旅館 1 晚',
        agent: '林小安', contactPhone: '0912-345-678', handover: '廣告投放與客戶回覆事項已交接給林小安。',
        costTransport: '2980', costLodging: '2400', costMeal: '1000', costOther: '',
      });
      pick('travelType', 'domestic');
      pick('tripType', 'multiDay');
      pick('transportModes', 'hsr');
      pick('needLodging', 'yes');
      pick('advanceNeeded', 'no');
    },
  });

  byId('startDate').addEventListener('change', () => {
    if (isMultiDay() && value('startDate') && !value('endDate')) { byId('endDate').value = value('startDate'); refresh(); }
  });
})();
