function onRadio(el) {
  document.querySelectorAll(`input[name="${el.name}"]`).forEach((r) => {
    r.closest('.rpill').classList.toggle('active', r === el);
  });

  if (el.name === 'leaveType') {
    const previousLeaveType = window.__lastLeaveType || '';
    const isLeaveTypeChanged = previousLeaveType !== el.value;
    const remark = document.getElementById('remark');
    if (isLeaveTypeChanged && (!remark || !remark.value.trim() || remark.value.trim() === (window.__autoPolicyRemarkText || ''))) {
      window.__remarkUserEdited = false;
    }
    const note = document.getElementById('note');
    if (isLeaveTypeChanged && (!note || !note.value.trim() || note.value.trim() === (window.__autoPolicyNoteText || ''))) {
      window.__noteUserEdited = false;
    }
    const showOther = el.value === 'other';
    const group = document.getElementById('leaveTypeOtherGroup');
    if (group) group.style.display = showOther ? '' : 'none';
    if (!showOther) {
      const other = document.getElementById('leaveTypeOther');
      if (other) other.value = '';
    }
    refreshReasonPresets();
    updateReasonRequirement();
    updateLeaveTypeTip();
    if (isLeaveTypeChanged) {
      resetReasonForLeaveType(el.value);
    }
    window.__lastLeaveType = el.value;
  }

  syncPrintHeader();
}

function onProofChange(el) {
  onRadio(el);
  const showNote = el.value === 'yes';
  const group = document.getElementById('proofNoteGroup');
  if (group) group.style.display = showNote ? '' : 'none';
  if (!showNote) {
    const note = document.getElementById('proofNote');
    if (note) note.value = '';
  }
}

function syncPrintHeader() {
  const docNo = document.getElementById('docNo').value || '';
  const date = document.getElementById('reqDate').value || '';
  document.getElementById('phDocNo').textContent = docNo;
  document.getElementById('phDate').textContent = date;
  updateWeekday();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function formatWeekday(value) {
  if (!value) return '';
  const weekdayMap = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
  const date = parseDateValue(value);
  return date ? weekdayMap[date.getDay()] : '';
}

function updateWeekday() {
  const weekday = formatWeekday(getText('reqDate'));
  const field = document.getElementById('weekday');
  if (field) field.value = weekday;
}

function updateReasonRequirement() {
  const label = document.getElementById('reasonLabel');
  const leaveType = getRadioValue('leaveType');
  const preset = document.getElementById('reasonPreset');
  if (!label) return;

  if (leaveType === 'annual') {
    label.innerHTML = '請假事由';
  } else {
    label.innerHTML = '請假事由 <span class="req">*</span>';
  }

  if (preset) {
    if (leaveType === 'annual' && !preset.value) {
      preset.options[0].textContent = '可選擇範例，亦可留空';
    } else if (!leaveType) {
      preset.options[0].textContent = '請先選擇假別';
    }
  }
}

function getDefaultReasonForLeaveType(leaveType) {
  const defaults = {
    annual: '因安排休假，申請特別休假。',
    personal: '因個人事務需親自處理，申請事假。',
    sick: '因身體不適需休養，申請病假。',
    official: '因公務需求辦理相關事項，申請公假。',
    marriage: '本人辦理結婚相關事宜，申請婚假。',
    maternity: '因生產相關需求，申請產假。',
    menstrual: '因生理不適，申請生理假。',
    bereavement: '因辦理治喪相關事宜，申請喪假。',
    other: '因其他事由需請假，申請其他假別。',
  };

  return defaults[leaveType] || '';
}

function resetReasonForLeaveType(leaveType) {
  const reasonField = document.getElementById('reason');
  const newDefault = getDefaultReasonForLeaveType(leaveType);

  if (window.__reasonUserEdited && reasonField && reasonField.value.trim()) {
    if (confirm('您已手動編輯請假事由，是否保留原本內容？')) {
      // 保留事由，只切換假別模式
      window.__reasonUserEdited = false;
      setReasonMode('manual', { clearPresetSelection: true });
      return;
    }
  }

  window.__reasonUserEdited = false;
  setReasonMode('manual', { clearPresetSelection: true });
  if (reasonField) {
    reasonField.value = newDefault;
  }
}

function updateLeaveTypeTip() {
  const leaveType = getRadioValue('leaveType');
  const tip = document.getElementById('leaveTypeTip');
  const tipText = document.getElementById('leaveTypeTipText');
  const helper = document.getElementById('bereavementHelper');
  const relation = document.getElementById('bereavementRelation');
  const summary = document.getElementById('leaveTypeSummary');
  const allowed = document.getElementById('allowedLeaveDays');
  const requested = document.getElementById('requestedLeaveDays');
  if (!tip || !tipText || !helper || !relation || !summary || !allowed || !requested) return;

  helper.style.display = 'none';
  summary.style.display = 'none';
  relation.value = '';
  allowed.value = '';
  requested.value = '';

  if (leaveType === 'marriage') {
    tip.style.display = 'flex';
    tipText.innerHTML = '婚假提醒：婚假法定總額為 8 日，可分次申請；實際剩餘日數請依既有使用情形確認。';
    summary.style.display = 'flex';
    allowed.value = '8 日';
    requested.value = getRequestedLeaveDaysText();
    syncPolicyRemark();
    syncPolicyNote();
    return;
  }

  if (leaveType === 'bereavement') {
    tip.style.display = 'flex';
    tipText.innerHTML = '喪假提醒：請先選擇與逝者關係，系統將顯示法定可請天數參考；如分次申請，實際剩餘日數請依既有使用情形確認。';
    summary.style.display = 'flex';
    requested.value = getRequestedLeaveDaysText();
    helper.style.display = 'block';
    syncPolicyRemark();
    syncPolicyNote();
    return;
  }

  tip.style.display = 'none';
  tipText.textContent = '';
  syncPolicyRemark();
  syncPolicyNote();
}

function updateBereavementDays() {
  const relation = document.getElementById('bereavementRelation');
  const allowed = document.getElementById('allowedLeaveDays');
  if (!relation || !allowed) return;

  allowed.value = relation.value ? `${relation.value} 日` : '';
  syncPolicyRemark();
  syncPolicyNote();
}

function getRequestedLeaveDaysText() {
  const days = getText('leaveDays');
  const hours = getText('leaveHours');
  const minutes = getText('leaveMinutes');
  const parts = [];

  if (days && days !== '0 天') parts.push(days);
  if (hours && hours !== '0 小時') parts.push(hours);
  if (minutes && minutes !== '0 分') parts.push(minutes);

  return parts.length ? parts.join(' ') : '';
}

function getPolicyRemarkText() {
  const leaveType = getRadioValue('leaveType');
  const requested = getRequestedLeaveDaysText();

  if (leaveType === 'marriage') {
    return requested
      ? `婚假法定總額 8 日；本次申請 ${requested}。若分次申請，實際剩餘日數請依既有使用情形確認。`
      : '婚假法定總額 8 日；若分次申請，實際剩餘日數請依既有使用情形確認。';
  }

  if (leaveType === 'bereavement') {
    const relation = document.getElementById('bereavementRelation');
    const relationText = relation && relation.selectedIndex > 0
      ? relation.options[relation.selectedIndex].text
      : '';
    const allowed = getText('allowedLeaveDays');
    if (relationText && allowed && requested) {
      return `喪假與逝者關係為「${relationText}」；法定可請 ${allowed}，本次申請 ${requested}。若分次申請，實際剩餘日數請依既有使用情形確認。`;
    }
    if (relationText && allowed) {
      return `喪假與逝者關係為「${relationText}」；法定可請 ${allowed}。若分次申請，實際剩餘日數請依既有使用情形確認。`;
    }
    return '喪假請先確認與逝者關係，以判定法定可請天數；如分次申請，實際剩餘日數請依既有使用情形確認。';
  }

  return '';
}

function syncPolicyRemark() {
  const remark = document.getElementById('remark');
  if (!remark) return;

  const nextText = getPolicyRemarkText();
  const previousText = window.__autoPolicyRemarkText || '';
  const currentText = remark.value.trim();

  if (!nextText) {
    if (currentText === previousText) {
      remark.value = '';
    }
    window.__autoPolicyRemarkText = '';
    return;
  }

  if (!window.__remarkUserEdited || currentText === previousText) {
    remark.value = nextText;
    window.__remarkUserEdited = false;
  }
  window.__autoPolicyRemarkText = nextText;
}

function getPolicyNoteText() {
  const leaveType = getRadioValue('leaveType');

  if (leaveType === 'marriage') {
    return '婚假得分次申請；若非一次請畢，剩餘可請日數請依既有使用情形確認。';
  }

  if (leaveType === 'bereavement') {
    const relation = document.getElementById('bereavementRelation');
    const relationText = relation && relation.selectedIndex > 0
      ? relation.options[relation.selectedIndex].text
      : '';

    return relationText
      ? `喪假天數請依與逝者關係判定；目前關係為「${relationText}」，如分次申請，剩餘可請日數請依既有使用情形確認。`
      : '喪假天數請依與逝者關係判定；如分次申請，剩餘可請日數請依既有使用情形確認。';
  }

  return '';
}

function syncPolicyNote() {
  const note = document.getElementById('note');
  if (!note) return;

  const nextText = getPolicyNoteText();
  const previousText = window.__autoPolicyNoteText || '';
  const currentText = note.value.trim();

  if (!nextText) {
    if (currentText === previousText) {
      note.value = '';
    }
    window.__autoPolicyNoteText = '';
    return;
  }

  if (!window.__noteUserEdited || currentText === previousText) {
    note.value = nextText;
    window.__noteUserEdited = false;
  }
  window.__autoPolicyNoteText = nextText;
}

function getRadioValue(name) {
  const el = document.querySelector(`input[name="${name}"]:checked`);
  return el ? el.value : '';
}

function getText(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value || '';
}

function parseDateValue(value) {
  if (!value) return null;
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function formatDate(value) {
  if (!value) return '';
  return value.replaceAll('-', '/');
}

function calculateLeaveUnits() {
  const startDate = parseDateValue(getText('startDate'));
  const endDate = parseDateValue(getText('endDate'));
  const startHour = Number(getText('startHour'));
  const startMinute = Number(getText('startMinute'));
  const endHour = Number(getText('endHour'));
  const endMinute = Number(getText('endMinute'));

  if (!startDate || !endDate || Number.isNaN(startHour) || Number.isNaN(startMinute) || Number.isNaN(endHour) || Number.isNaN(endMinute)) {
    return { days: '', hours: '', minutes: '', units: null, invalid: false };
  }

  if (
    startHour < 0 || startHour > 23 || startMinute < 0 || startMinute > 59 ||
    endHour < 0 || endHour > 23 || endMinute < 0 || endMinute > 59
  ) {
    return { days: '', hours: '', minutes: '', units: null, invalid: true };
  }

  if (![0, 30].includes(startMinute) || ![0, 30].includes(endMinute)) {
    return { days: '', hours: '', minutes: '', units: null, invalid: true };
  }

  const start = new Date(startDate);
  const end = new Date(endDate);
  start.setHours(startHour, startMinute, 0, 0);
  end.setHours(endHour, endMinute, 0, 0);

  const rawDiffMinutes = Math.round((end - start) / (1000 * 60));
  if (rawDiffMinutes <= 0 || rawDiffMinutes % 30 !== 0) {
    return { days: '', hours: '', minutes: '', units: null, invalid: true };
  }

  // 逐日計算與午休（13:00–14:00）重疊的分鐘數並扣除
  const LUNCH_START = 13 * 60; // 780 分
  const LUNCH_END   = 14 * 60; // 840 分
  let lunchDeduction = 0;
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const isSameAsStart = cursor.toDateString() === start.toDateString();
    const isSameAsEnd   = cursor.toDateString() === end.toDateString();
    const daySliceStart = isSameAsStart ? (startHour * 60 + startMinute) : 0;
    const daySliceEnd   = isSameAsEnd   ? (endHour   * 60 + endMinute)   : 24 * 60;

    // 與午休重疊的分鐘
    const overlapStart = Math.max(daySliceStart, LUNCH_START);
    const overlapEnd   = Math.min(daySliceEnd,   LUNCH_END);
    if (overlapEnd > overlapStart) {
      lunchDeduction += overlapEnd - overlapStart;
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  const diffMinutes = rawDiffMinutes - lunchDeduction;
  if (diffMinutes <= 0) {
    return { days: '', hours: '', minutes: '', units: null, invalid: true };
  }

  const workdayMinutes = 8 * 60;
  const days = Math.floor(diffMinutes / workdayMinutes);
  const remainingMinutes = diffMinutes % workdayMinutes;
  const hours = Math.floor(remainingMinutes / 60);
  const minutes = remainingMinutes % 60;

  return {
    days: String(days),
    hours: String(hours),
    minutes: String(minutes),
    units: diffMinutes,
    invalid: false,
  };
}

function updateLeaveSummary() {
  const result = calculateLeaveUnits();
  document.getElementById('leaveDays').value = result.days ? `${result.days} 天` : '';
  document.getElementById('leaveHours').value = result.hours ? `${result.hours} 小時` : '';
  document.getElementById('leaveMinutes').value = result.minutes ? `${result.minutes} 分` : '';

  const requested = document.getElementById('requestedLeaveDays');
  if (requested) {
    requested.value = getRequestedLeaveDaysText();
  }
  syncPolicyRemark();
  syncPolicyNote();
}

function clearForm() {
  if (!confirm('確定要清除所有填寫內容？')) return;
  window.__currentRecentLeaveRecordId = '';
  window.__currentLeaveDraftId = '';

  document.querySelectorAll('input:not([type="radio"]), textarea').forEach((el) => {
    el.value = '';
  });

  document.querySelectorAll('input[type="radio"]').forEach((el) => {
    el.checked = false;
    const pill = el.closest('.rpill');
    if (pill) pill.classList.remove('active');
  });

  document.getElementById('leaveTypeOtherGroup').style.display = 'none';
  document.getElementById('proofNoteGroup').style.display = 'none';
  document.getElementById('reqDate').value = today();
  window.__autoPolicyRemarkText = '';
  window.__remarkUserEdited = false;
  window.__autoPolicyNoteText = '';
  window.__noteUserEdited = false;
  window.__reasonUserEdited = false;
  syncPrintHeader();
}

function fillSample() {
  document.getElementById('reqDate').value = today();
  document.getElementById('applicant').value = '陳小華';
  document.getElementById('department').value = '行銷部';
  document.getElementById('jobTitle').value = '行銷專員';
  document.getElementById('employeeId').value = 'EMP0012';
  document.getElementById('manager').value = '王經理';

  const leaveType = document.querySelector('input[name="leaveType"][value="personal"]');
  leaveType.checked = true;
  onRadio(leaveType);

  document.getElementById('startDate').value = today();
  document.getElementById('endDate').value = today();
  document.getElementById('startHour').value = '8';
  document.getElementById('startMinute').value = '30';
  document.getElementById('endHour').value = '17';
  document.getElementById('endMinute').value = '30';
  updateLeaveSummary();

  document.getElementById('reason').value = '家庭事務需親自處理';
  document.getElementById('agent').value = '林小安';
  document.getElementById('contactPhone').value = '0912-345-678';
  document.getElementById('handover').value = '已將本日廣告投放排程與客戶回覆事項交接給林小安處理。';

  const hasProof = document.querySelector('input[name="hasProof"][value="no"]');
  hasProof.checked = true;
  onProofChange(hasProof);
  document.getElementById('remark').value = '若有緊急事項可先以電話聯繫。';
  document.getElementById('note').value = DEFAULT_NOTE_TEXT;
  window.__autoPolicyNoteText = DEFAULT_NOTE_TEXT;
  syncPrintHeader();
}

const sampleLibrary = Array.isArray(window.LEAVE_REASON_LIBRARY)
  ? window.LEAVE_REASON_LIBRARY
  : [];

function setReasonMode(mode, options = {}) {
  const { clearPresetSelection = false } = options;
  const presetMode = document.querySelector('input[name="reasonMode"][value="preset"]');
  const manualMode = document.querySelector('input[name="reasonMode"][value="manual"]');
  const preset = document.getElementById('reasonPreset');
  const isPreset = mode === 'preset';

  if (presetMode) {
    presetMode.checked = isPreset;
    presetMode.closest('.rpill')?.classList.toggle('active', isPreset);
  }

  if (manualMode) {
    manualMode.checked = !isPreset;
    manualMode.closest('.rpill')?.classList.toggle('active', !isPreset);
  }

  if (preset) {
    preset.disabled = !isPreset;
    if (clearPresetSelection) {
      preset.value = '';
    }
  }
}

function onReasonModeChange(el) {
  onRadio(el);
  const isPreset = el.value === 'preset';
  const preset = document.getElementById('reasonPreset');
  if (preset) {
    preset.disabled = !isPreset;
    if (!isPreset) preset.value = '';
  }
}

function hasReasonPresets(leaveType) {
  return sampleLibrary.some((item) => item.category === leaveType);
}

function isSampleReason(reasonText) {
  return sampleLibrary.some((item) => item.reason === reasonText);
}

function isSampleRemark(remarkText) {
  return sampleLibrary.some((item) => item.remark === remarkText);
}

function refreshReasonPresets() {
  const row = document.getElementById('reasonPresetRow');
  const preset = document.getElementById('reasonPreset');
  const leaveType = getRadioValue('leaveType');
  const presetMode = document.querySelector('input[name="reasonMode"][value="preset"]');
  const manualMode = document.querySelector('input[name="reasonMode"][value="manual"]');
  if (!preset || !row || !presetMode || !manualMode) return;

  const options = sampleLibrary.filter((item) => item.category === leaveType);
  const showPresetTools = options.length > 0;

  row.style.display = showPresetTools ? '' : 'none';
  if (!showPresetTools) {
    setReasonMode('manual', { clearPresetSelection: true });
    preset.innerHTML = '<option value="">此假別無範本</option>';
    return;
  }

  setReasonMode('preset');
  let html = '';
  if (!leaveType) {
    html = '<option value="">請先選擇假別</option>';
  } else if (!options.length) {
    html = '<option value="">此假別目前沒有範本</option>';
  } else {
    html = leaveType === 'annual'
      ? '<option value="">可選擇範例，亦可留空</option>'
      : '<option value="">請選擇範本</option>';
    html += options.map((item) => `<option value="${item.label}">${item.label}</option>`).join('');
  }
  preset.innerHTML = html;
}

function applyReasonPreset(value) {
  if (!value || getRadioValue('reasonMode') !== 'preset') return;
  const sample = sampleLibrary.find((item) => item.label === value);
  if (!sample) return;

  window.__reasonUserEdited = false;
  document.getElementById('reason').value = sample.reason;
}

function handleReasonInput() {
  window.__reasonUserEdited = true;

  const leaveType = getRadioValue('leaveType');
  const currentMode = getRadioValue('reasonMode');
  const preset = document.getElementById('reasonPreset');

  if (!leaveType || !hasReasonPresets(leaveType) || currentMode !== 'preset' || !preset || !preset.value) {
    return;
  }

  const selectedSample = sampleLibrary.find((item) => item.label === preset.value && item.category === leaveType);
  if (!selectedSample) return;

  if (getText('reason') !== selectedSample.reason) {
    setReasonMode('manual');
  }
}

function validateForm() {
  const missing = [];
  [
    ['reqDate', '申請日期'],
    ['applicant', '申請人'],
    ['department', '部門'],
    ['startDate', '開始日期'],
    ['endDate', '結束日期'],
    ['startHour', '開始時'],
    ['startMinute', '開始分'],
    ['endHour', '結束時'],
    ['endMinute', '結束分'],
    ['agent', '代理人'],
    ['contactPhone', '聯絡電話'],
  ].forEach(([id, label]) => {
    if (!getText(id)) missing.push(label);
  });

  if (!getRadioValue('leaveType')) missing.push('假別');
  if (!getRadioValue('hasProof')) missing.push('是否附證明文件');

  if (getRadioValue('leaveType') === 'other' && !getText('leaveTypeOther')) {
    missing.push('其他假別說明');
  }

  if (getRadioValue('leaveType') === 'bereavement' && !getText('bereavementRelation')) {
    missing.push('與逝者關係');
  }

  if (getRadioValue('leaveType') !== 'annual' && !getText('reason')) {
    missing.push('請假事由');
  }

  if (hasReasonPresets(getRadioValue('leaveType')) && !getRadioValue('reasonMode')) {
    missing.push('事由模式');
  }

  if (
    hasReasonPresets(getRadioValue('leaveType')) &&
    getRadioValue('reasonMode') === 'preset' &&
    getRadioValue('leaveType') !== 'annual' &&
    !getText('reasonPreset')
  ) {
    missing.push('事由範本');
  }

  if (getRadioValue('hasProof') === 'yes' && !getText('proofNote')) {
    missing.push('證明文件說明');
  }

  const result = calculateLeaveUnits();
  if (result.invalid) {
    missing.push('請假區間設定不正確');
  }

  if (getText('startMinute') && !['0', '00', '30'].includes(getText('startMinute'))) {
    missing.push('開始分僅支援 00 或 30');
  }

  if (getText('endMinute') && !['0', '00', '30'].includes(getText('endMinute'))) {
    missing.push('結束分僅支援 00 或 30');
  }

  return missing;
}

function buildPreview() {
  const leaveTypeMap = {
    annual: '特休',
    personal: '事假',
    sick: '病假',
    official: '公假',
    marriage: '婚假',
    maternity: '產假',
    menstrual: '生理假',
    bereavement: '喪假',
    other: getText('leaveTypeOther') || '其他',
  };

  setText('pv-docno', getText('docNo'));
  setText('pv-date', formatDate(getText('reqDate')));
  setText('pv-reqdate', formatDate(getText('reqDate')));
  setText('pv-weekday', getText('weekday'));
  setText('pv-applicant', getText('applicant'));
  setText('pv-dept', getText('department'));
  setText('pv-jobtitle', getText('jobTitle'));
  setText('pv-employeeid', getText('employeeId'));
  setText('pv-manager', getText('manager'));
  setText('pv-leavetype', leaveTypeMap[getRadioValue('leaveType')] || '');

  const period = [
    `${formatDate(getText('startDate'))} ${getText('startHour').padStart(2, '0')}:${getText('startMinute').padStart(2, '0')}`,
    '至',
    `${formatDate(getText('endDate'))} ${getText('endHour').padStart(2, '0')}:${getText('endMinute').padStart(2, '0')}`,
  ].join(' ');
  setText('pv-period', period);

  setText('pv-days', getText('leaveDays'));
  setText('pv-hours', getText('leaveHours'));
  setText('pv-minutes', getText('leaveMinutes'));
  setText('pv-reason', getText('reason'));
  setText('pv-agent', getText('agent'));
  setText('pv-phone', getText('contactPhone'));
  setText('pv-handover', getText('handover'));
  setText('pv-proof', getRadioValue('hasProof') === 'yes' ? '有' : '無');
  setText('pv-proofnote', getText('proofNote'));
  setText('pv-remark', getText('remark'));
  setText('pv-note', getText('note'));
}

function getLeaveRecordTitle() {
  const leaveTypeMap = {
    annual: '特休',
    personal: '事假',
    sick: '病假',
    official: '公假',
    marriage: '婚假',
    maternity: '產假',
    menstrual: '生理假',
    bereavement: '喪假',
    other: getText('leaveTypeOther') || '其他',
  };
  const applicant = getText('applicant') || '未填姓名';
  const leaveType = leaveTypeMap[getRadioValue('leaveType')] || '未選假別';
  const date = formatDate(getText('startDate') || getText('reqDate')) || '未填日期';
  return `${applicant}｜${leaveType}｜${date}`;
}

function saveRecentLeaveRecord() {
  const record = FormRecentRecords.save(
    'leave',
    getLeaveRecordTitle(),
    FormRecentRecords.collect(document.getElementById('fillPage')),
    window.__currentRecentLeaveRecordId || ''
  );
  window.__currentRecentLeaveRecordId = record.id;
}

function printAndSaveRecentLeaveRecord() {
  saveRecentLeaveRecord();
  window.print();
}

function loadRecentLeaveRecord() {
  const record = FormRecentRecords.pick('leave');
  if (!record) return;

  restoreLeaveFormData(record.data);
  window.__currentRecentLeaveRecordId = record.id;
  window.__currentLeaveDraftId = '';
}

function saveLeaveDraft() {
  const draft = FormRecentRecords.saveDraft(
    'leave',
    getLeaveRecordTitle(),
    FormRecentRecords.collect(document.getElementById('fillPage')),
    window.__currentLeaveDraftId || ''
  );
  if (!draft) return;

  window.__currentLeaveDraftId = draft.id;
  alert('草稿已儲存。');
}

function loadLeaveDraft() {
  const draft = FormRecentRecords.pickDraft('leave');
  if (!draft) return;

  restoreLeaveFormData(draft.data);
  window.__currentLeaveDraftId = draft.id;
  window.__currentRecentLeaveRecordId = '';
}

function restoreLeaveFormData(data) {
  FormRecentRecords.restore(data, document.getElementById('fillPage'));
  const savedReasonPreset = data.reasonPreset || '';
  const savedBereavementRelation = data.bereavementRelation || '';
  window.__lastLeaveType = getRadioValue('leaveType');
  window.__reasonUserEdited = false;
  window.__remarkUserEdited = Boolean(getText('remark'));
  window.__noteUserEdited = Boolean(getText('note'));
  refreshReasonPresets();
  const reasonPreset = document.getElementById('reasonPreset');
  if (reasonPreset && savedReasonPreset) reasonPreset.value = savedReasonPreset;
  updateReasonRequirement();
  updateLeaveTypeTip();
  const bereavementRelation = document.getElementById('bereavementRelation');
  if (bereavementRelation && savedBereavementRelation) {
    bereavementRelation.value = savedBereavementRelation;
    updateBereavementDays();
  }
  updateLeaveSummary();
  syncPrintHeader();
  document.getElementById('previewPage').style.display = 'none';
  document.getElementById('fillPage').style.display = 'block';
  window.scrollTo(0, 0);
}

function goToPreview() {
  const missing = validateForm();
  if (missing.length) {
    alert('以下欄位尚未填寫或設定有誤，請補充後再繼續：\n\n• ' + missing.join('\n• '));
    return;
  }

  buildPreview();
  document.getElementById('fillPage').style.display = 'none';
  document.getElementById('previewPage').style.display = 'block';
  window.scrollTo(0, 0);
}

function goBack() {
  document.getElementById('previewPage').style.display = 'none';
  document.getElementById('fillPage').style.display = 'block';
  window.scrollTo(0, 0);
}

['docNo', 'reqDate'].forEach((id) => {
  document.getElementById(id).addEventListener('input', syncPrintHeader);
});

document.getElementById('startDate').addEventListener('input', updateLeaveSummary);
document.getElementById('endDate').addEventListener('input', updateLeaveSummary);
['startHour', 'startMinute', 'endHour', 'endMinute'].forEach((id) => {
  document.getElementById(id).addEventListener('change', updateLeaveSummary);
});
document.getElementById('reason').addEventListener('input', handleReasonInput);
document.getElementById('remark').addEventListener('input', () => {
  window.__remarkUserEdited = true;
});
document.getElementById('note').addEventListener('input', () => {
  window.__noteUserEdited = true;
});

const DEFAULT_NOTE_TEXT = '請假須經獲批准後始生效，假滿後請準時上班';
document.getElementById('reqDate').value = today();
window.__autoPolicyRemarkText = '';
window.__remarkUserEdited = false;
window.__autoPolicyNoteText = '';
window.__noteUserEdited = false;
window.__currentRecentLeaveRecordId = '';
window.__currentLeaveDraftId = '';
refreshReasonPresets();
updateReasonRequirement();
updateLeaveTypeTip();
syncPrintHeader();

window.addEventListener('beforeprint', syncPrintHeader);
