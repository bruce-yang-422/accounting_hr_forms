(() => {
  const { byId, value, radioLabel, text, setValues, pick } = FormPage;

  const period = () => FormCalc.periodMinutes({
    startDate: value('startDate'), startHour: value('startHour'), startMinute: value('startMinute'),
    endDate: value('endDate'), endHour: value('endHour'), endMinute: value('endMinute'), restMinutes: value('restMinutes'),
  });
  const moment = prefix => `${FormCalc.slashDate(value(`${prefix}Date`))} ${value(`${prefix}Hour`).padStart(2, '0')}:${value(`${prefix}Minute`).padStart(2, '0')}`;

  function refresh() {
    const { minutes } = period();
    byId('overtimeHours').value = minutes ? FormCalc.hoursText(minutes) : '';
    byId('overtimeWeekday').value = FormCalc.weekday(value('startDate'));
  }

  FormPage.setup({
    type: 'overtime',
    label: '加班申請單',
    title() {
      const hours = period().minutes;
      return [value('applicant') || '未填申請人', radioLabel('dayType') || '未選日別', hours ? FormCalc.hoursText(hours) : '未填時數',
        FormCalc.slashDate(value('startDate') || value('reqDate')) || '未填日期'].join('｜');
    },
    summaryFields: [['applicant', '申請人'], ['startDate', '開始日期'], ['endDate', '結束日期'], ['overtimeHours', '加班時數'], ['reason', '事由'], ['workContent', '工作內容'], ['remark', '備註']],
    sections: [
      [{ id: 'reqDate', label: '申請日期' }, { id: 'applicant', label: '申請人' }, { id: 'department', label: '單位' }],
      [
        { radio: 'dayType', label: '加班日別' }, { radio: 'compensation', label: '補償方式' },
        { id: 'startDate', label: '開始日期' }, { id: 'startHour', label: '開始時' }, { id: 'startMinute', label: '開始分' },
        { id: 'endDate', label: '結束日期' }, { id: 'endHour', label: '結束時' }, { id: 'endMinute', label: '結束分' },
        { ok: () => !period().invalid, label: '加班時間設定不正確（結束須晚於開始，且須長於休息時間）' },
      ],
      [{ id: 'reason', label: '加班事由' }],
    ],
    refresh,
    preview() {
      const { minutes } = period();
      text('pv-reqdate', FormCalc.slashDate(value('reqDate')));
      text('pv-applicant', value('applicant'));
      text('pv-dept', value('department'));
      text('pv-jobtitle', value('jobTitle'));
      text('pv-employeeid', value('employeeId'));
      text('pv-manager', value('manager'));
      text('pv-applytype', radioLabel('applyType'));
      text('pv-daytype', `${radioLabel('dayType')}（${FormCalc.weekday(value('startDate'))}）`);
      text('pv-period', `${moment('start')} 至 ${moment('end')}`);
      text('pv-rest', `${value('restMinutes') || 0} 分鐘`);
      text('pv-hours', minutes ? FormCalc.hoursText(minutes) : '');
      text('pv-compensation', radioLabel('compensation'));
      text('pv-reason', value('reason'));
      text('pv-work', value('workContent'));
      text('pv-remark', value('remark'));
    },
    sample() {
      const today = FormCalc.localDate();
      setValues({
        applicant: '陳小華', department: '行銷部', jobTitle: '行銷專員', employeeId: 'EMP0012', manager: '王經理',
        startDate: today, startHour: '18', startMinute: '0', endDate: today, endHour: '20', endMinute: '30', restMinutes: '0',
        reason: '月底檔期活動上線，需完成廣告素材更新', workContent: '更新活動頁素材與廣告投放設定，並完成上線後檢查。',
      });
      pick('dayType', 'weekday');
      pick('compensation', 'pay');
    },
  });

  // Most overtime ends on the day it starts; only suggest, never overwrite.
  byId('startDate').addEventListener('change', () => {
    if (value('startDate') && !value('endDate')) { byId('endDate').value = value('startDate'); refresh(); }
  });
})();
