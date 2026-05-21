/* Chinese Uppercase Conversion */
function numToChinese(amount) {
  if (!amount || isNaN(amount)) return '';
  amount = parseFloat(amount);
  if (amount <= 0) return '';

  const D = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
  const SU = ['', '萬', '億', '兆'];

  const tc = Math.round(amount * 100);
  const yuan = Math.floor(tc / 100);
  const jiao = Math.floor((tc % 100) / 10);
  const fen = tc % 10;

  function g4(n) {
    if (!n) return '';
    const th = Math.floor(n / 1000);
    const hu = Math.floor((n % 1000) / 100);
    const te = Math.floor((n % 100) / 10);
    const on = n % 10;
    let s = '';

    if (th) s += D[th] + '仟';
    if (hu) {
      s += D[hu] + '佰';
    } else if (th && (te || on)) {
      s += '零';
    }
    if (te) {
      s += D[te] + '拾';
    } else if ((th || hu) && on) {
      s += '零';
    }
    if (on) s += D[on];
    return s;
  }

  function convYuan(n) {
    if (!n) return '零';
    const parts = [];
    let t = n;

    while (t > 0) {
      parts.unshift(t % 10000);
      t = Math.floor(t / 10000);
    }

    let r = '';
    parts.forEach((p, i) => {
      const su = SU[parts.length - 1 - i];
      if (!p) {
        if (r && !r.endsWith('零')) r += '零';
      } else {
        const s = g4(p);
        if (r && p < 1000 && !r.endsWith('零')) r += '零';
        r += s + su;
      }
    });

    return r.replace(/零+$/, '') || '零';
  }

  let res = '';
  if (yuan > 0) res += convYuan(yuan) + '元';

  if (jiao > 0 && fen > 0) {
    res += D[jiao] + '角' + D[fen] + '分';
  } else if (jiao > 0) {
    res += D[jiao] + '角整';
  } else if (fen > 0) {
    if (yuan > 0) res += '零';
    res += D[fen] + '分';
  } else {
    res += '整';
  }

  return res;
}

function fmtNum(n) {
  return parseFloat(n).toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function taxMode() {
  const el = document.querySelector('input[name="taxMode"]:checked');
  return el ? el.value : 'incl';
}

function onTaxMode(el) {
  onRadio(el);
  const exempt = el.value === 'excl';
  document.getElementById('mainAmtLabel').innerHTML = '金額（NT$）<span class="req">*</span>';
  document.getElementById('amtBarLabel').textContent = '金額';
  document.getElementById('amtBarBadge').textContent = exempt ? '免稅' : '應稅 5%';
  document.getElementById('netLabel').textContent = '未稅金額（NT$）';

  const netEl = document.getElementById('amtNet');
  netEl.readOnly = true;
  netEl.classList.add('fi-auto');
  netEl.placeholder = '自動計算';

  document.getElementById('amtGross').value = '';
  netEl.value = '';
  document.getElementById('amtTax').value = '';
  document.getElementById('amtChinese').value = '';
  document.getElementById('amtBar').style.display = 'none';
}

function onAmtInput() {
  const raw = parseFloat(document.getElementById('amtGross').value) || 0;
  const mode = taxMode();
  let gross;
  let net;
  let tax;

  if (mode === 'excl') {
    gross = raw;
    net = raw;
    tax = 0;
  } else {
    gross = raw;
    net = gross > 0 ? Math.round(gross / 1.05) : 0;
    tax = gross - net;
  }

  document.getElementById('amtNet').value = gross > 0 ? net : '';
  document.getElementById('amtTax').value = gross > 0 ? tax : '';

  const zh = numToChinese(gross);
  document.getElementById('amtChinese').value = zh;

  const bar = document.getElementById('amtBar');
  if (gross > 0) {
    bar.style.display = 'flex';
    document.getElementById('amtBarNum').textContent = 'NT$ ' + fmtNum(gross);
    document.getElementById('amtBarZh').textContent = zh;
  } else {
    bar.style.display = 'none';
  }
}

function onRadio(el) {
  document.querySelectorAll(`input[name="${el.name}"]`).forEach((r) => {
    r.closest('.rpill').classList.toggle('active', r === el);
  });

  if (el.name === 'payMethod') {
    const isTransfer = el.value === 'transfer';
    const bankRows = [
      document.getElementById('bankInfoRow'),
      document.getElementById('bankAccountRow'),
    ];

    bankRows.forEach((row) => {
      if (row) row.style.display = isTransfer ? '' : 'none';
    });

    if (!isTransfer) {
      ['bankName', 'bankBranch', 'bankAccount'].forEach((id) => {
        const field = document.getElementById(id);
        if (field) field.value = '';
      });
    }
  }

  if (el.name === 'payeeType') {
    const group = document.getElementById('taxIdGroup');
    const label = group ? group.querySelector('.flabel') : null;
    const input = document.getElementById('taxId');

    if (el.value === 'company') {
      group.style.display = '';
      if (label) label.innerHTML = '統一編號 <span class="req">*</span>';
      if (input) input.placeholder = '8 碼統一編號';
    } else if (el.value === 'person') {
      group.style.display = '';
      if (label) label.innerHTML = '身分證字號 <span class="req">*</span>';
      if (input) input.placeholder = '身分證字號';
    } else {
      group.style.display = 'none';
      if (input) input.value = '';
    }
  }

  syncPrintHeader();
}

function setRadio(name, value) {
  const el = document.querySelector(`input[name="${name}"][value="${value}"]`);
  if (el) {
    el.checked = true;
    onRadio(el);
  }
}

function syncPrintHeader() {
  const docNo = document.getElementById('docNo').value || '';
  const date = document.getElementById('reqDate').value || '';
  document.getElementById('phDocNo').textContent = docNo;
  document.getElementById('phDate').textContent = date;
}

['docNo', 'reqDate'].forEach((id) =>
  document.getElementById(id).addEventListener('input', syncPrintHeader)
);

function onAttach(el) {
  onRadio(el);
  const hasIt = el.value === 'yes';
  document.getElementById('attachCountGroup').style.display = hasIt ? '' : 'none';
  document.getElementById('attachTypesRow').style.display = hasIt ? '' : 'none';

  if (!hasIt) {
    document.getElementById('attachCount').value = '1';
    document.querySelectorAll('#attachTypes input[type="checkbox"]').forEach((c) => {
      c.checked = false;
      c.closest('.cbox-item').classList.remove('checked');
    });
  }
}

function onCbox(el) {
  el.closest('.cbox-item').classList.toggle('checked', el.checked);
  if (el.value === 'other') {
    const row = document.getElementById('attachOtherRow');
    if (row) row.style.display = el.checked ? '' : 'none';
    if (!el.checked) {
      const t = document.getElementById('attachOtherText');
      if (t) t.value = '';
    }
  }
}

function clearForm() {
  if (!confirm('確定要清除所有填寫內容？')) return;
  window.__currentRecentPaymentRecordId = '';
  window.__currentPaymentDraftId = '';

  document.querySelectorAll('input:not([type="radio"]):not([type="checkbox"]), textarea').forEach((el) => {
    if (el.id === 'attachCount') {
      el.value = '1';
    } else {
      el.value = '';
    }
  });

  document.querySelectorAll('input[type="radio"]').forEach((el) => {
    el.checked = false;
    const pill = el.closest('.rpill');
    if (pill) pill.classList.remove('active');
  });

  document.querySelectorAll('input[type="checkbox"]').forEach((el) => {
    el.checked = false;
    const cbox = el.closest('.cbox-item');
    if (cbox) cbox.classList.remove('checked');
  });

  document.getElementById('amtBar').style.display = 'none';
  document.getElementById('attachCountGroup').style.display = 'none';
  document.getElementById('attachTypesRow').style.display = 'none';
  document.getElementById('attachOtherRow').style.display = 'none';
  document.getElementById('bankInfoRow').style.display = 'none';
  document.getElementById('bankAccountRow').style.display = 'none';
  document.getElementById('reqDate').value = today();
  setRadio('taxMode', 'incl');
  onTaxMode(document.querySelector('input[name="taxMode"][value="incl"]'));
  const tg = document.getElementById('taxIdGroup');
  if (tg) tg.style.display = '';
  syncPrintHeader();
}

function fillSample() {
  document.getElementById('reqDate').value = today();
  document.getElementById('applicant').value = '陳小華';
  document.getElementById('department').value = '行銷部';
  document.getElementById('acctCategory').value = '廣告費';
  document.getElementById('reason').value = '蝦皮 / Shopee 電商平台廣告投放費用（3 月份）';
  setRadio('taxMode', 'incl');
  onTaxMode(document.querySelector('input[name="taxMode"][value="incl"]'));
  document.getElementById('amtGross').value = '50000';
  onAmtInput();
  document.getElementById('payee').value = '蝦皮購物股份有限公司';
  setRadio('payeeType', 'company');
  document.getElementById('taxId').value = '54348525';
  setRadio('payMethod', 'transfer');
  document.getElementById('bankName').value = '中國信託';
  document.getElementById('bankBranch').value = '內湖分行';
  document.getElementById('bankAccount').value = '123-456789-01';
  setRadio('voucherType', 'invoice');
  document.getElementById('voucherNo').value = 'AB-12345678';
  document.getElementById('voucherDate').value = today();
  setRadio('hasAttach', 'yes');
  onAttach(document.querySelector('input[name="hasAttach"][value="yes"]'));
  document.getElementById('attachCount').value = '2';
  ['invoice', 'transfer'].forEach((v) => {
    const cb = document.querySelector(`#attachTypes input[value="${v}"]`);
    if (cb) {
      cb.checked = true;
      cb.closest('.cbox-item').classList.add('checked');
    }
  });
  syncPrintHeader();
}

function today() {
  return new Date().toISOString().split('T')[0];
}

document.getElementById('reqDate').value = today();
syncPrintHeader();

function validateForm() {
  const missing = [];
  [
    ['reqDate', '請款日期'],
    ['applicant', '申請人'],
    ['department', '部門'],
    ['acctCategory', '科目'],
    ['reason', '請款事由'],
    ['amtGross', '金額'],
    ['payee', '付款對象（戶名）'],
    ['voucherNo', '憑證號碼'],
    ['voucherDate', '開立日期（憑證）'],
  ].forEach(([id, label]) => {
    const el = document.getElementById(id);
    if (!el || !String(el.value).trim()) {
      missing.push(label);
    } else if (id === 'amtGross' && parseFloat(el.value) <= 0) {
      missing.push('金額必須大於零');
    }
  });

  if (!document.querySelector('input[name="payeeType"]:checked')) missing.push('受款方身分');
  if (!document.querySelector('input[name="payMethod"]:checked')) missing.push('付款方式');
  if (!document.querySelector('input[name="voucherType"]:checked')) missing.push('憑證類型');
  if (!document.querySelector('input[name="hasAttach"]:checked')) missing.push('是否附單據');

  const pm = document.querySelector('input[name="payMethod"]:checked');
  if (pm && pm.value === 'transfer') {
    if (!document.getElementById('bankName').value.trim()) missing.push('匯款銀行');
    if (!document.getElementById('bankAccount').value.trim()) missing.push('匯款帳號');
  }

  return missing;
}

function goToPreview() {
  const missing = validateForm();
  if (missing.length) {
    alert('以下欄位尚未填寫，請補充後再繼續：\n\n• ' + missing.join('\n• '));
    return;
  }

  const pt = document.querySelector('input[name="payeeType"]:checked');
  if (pt && pt.value !== 'employee') {
    const taxId = document.getElementById('taxId').value.trim();
    if (!taxId) {
      const label = pt.value === 'person' ? '身分證字號' : '統一編號';
      if (!confirm(`${label} 尚未填寫，確定仍要繼續？`)) return;
    }
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

function gv(id) {
  const e = document.getElementById(id);
  return e ? e.value.trim() : '';
}

function gr(name) {
  const e = document.querySelector(`input[name="${name}"]:checked`);
  return e ? e.value : '';
}

function pset(id, val) {
  const e = document.getElementById(id);
  if (e) e.textContent = val || '';
}

function pshow(id, show) {
  const e = document.getElementById(id);
  if (e) e.style.display = show ? '' : 'none';
}

function buildPreview() {
  pset('pv-docno', gv('docNo'));
  pset('pv-date', gv('reqDate'));
  pset('pv-reqdate', gv('reqDate'));
  pset('pv-applicant', gv('applicant'));
  pset('pv-dept', gv('department'));
  pset('pv-acct', gv('acctCategory'));
  pset('pv-reason', gv('reason'));

  const mode = gr('taxMode');
  const rawAmt = parseFloat(gv('amtGross')) || 0;
  let grossAmt;
  let netAmt;
  let taxAmt;

  if (mode === 'excl') {
    grossAmt = rawAmt;
    netAmt = rawAmt;
    taxAmt = 0;
  } else {
    grossAmt = rawAmt;
    netAmt = grossAmt > 0 ? Math.round(grossAmt / 1.05) : 0;
    taxAmt = grossAmt - netAmt;
  }

  pset('pv-gross', grossAmt > 0 ? 'NT$ ' + fmtNum(grossAmt) : '');
  pset('pv-chinese', gv('amtChinese'));
  pset('pv-net', grossAmt > 0 ? 'NT$ ' + fmtNum(netAmt) : 'NT$ 0');
  pset('pv-tax', grossAmt > 0 ? 'NT$ ' + fmtNum(taxAmt) : 'NT$ 0');
  document.getElementById('pv-grosslbl').innerHTML = mode === 'excl'
    ? '<span>金</span><span>額</span><span>免</span><span>稅</span>'
    : '<span>含</span><span>稅</span><span>金</span><span>額</span>';

  const ptMap = { company: '公司', person: '自然人', employee: '員工' };
  const pmMap = { transfer: '匯款轉帳', cash: '現金', check: '支票' };
  const pt = gr('payeeType');
  const pm = gr('payMethod');

  pset('pv-payee', gv('payee'));
  pset('pv-payee-type', ptMap[pt] || '');
  pset('pv-paymethod', pmMap[pm] || '');

  const showTaxId = pt && pt !== 'employee';
  document.querySelectorAll('.pv-taxid-part').forEach((e) => {
    e.style.display = showTaxId ? '' : 'none';
  });
  if (showTaxId) {
    document.getElementById('pv-taxid-lbl').innerHTML = pt === 'person'
      ? '<span>身</span><span>分</span><span>證</span><span>字</span><span>號</span>'
      : '<span>統</span><span>一</span><span>編</span><span>號</span>';
    pset('pv-taxid', gv('taxId'));
  }

  const isTransfer = pm === 'transfer';
  pshow('pv-bankrow', isTransfer);
  pshow('pv-acctrow', isTransfer);
  if (isTransfer) {
    pset('pv-bank', [gv('bankName'), gv('bankBranch')].filter(Boolean).join('　'));
    pset('pv-bankacct', gv('bankAccount'));
  }

  const vtMap = { invoice: '發票', receipt: '收據', other: '其他' };
  pset('pv-vtype', vtMap[gr('voucherType')] || '');
  pset('pv-vno', gv('voucherNo'));
  pset('pv-vdate', gv('voucherDate'));

  const hasAtt = gr('hasAttach') === 'yes';
  pset('pv-attach', hasAtt ? '有' : (gr('hasAttach') ? '無' : ''));
  pset('pv-attachcnt', hasAtt ? gv('attachCount') + ' 件' : '');
  if (hasAtt) {
    const attMap = {
      invoice: '統一發票',
      receipt: '收據',
      reqform: '請款單',
      transfer: '匯款證明',
      contract: '合約/訂單',
    };
    const labels = [];
    document.querySelectorAll('#attachTypes input[type="checkbox"]:checked').forEach((cb) => {
      labels.push(
        cb.value === 'other'
          ? '其他：' + (gv('attachOtherText') || '其他')
          : (attMap[cb.value] || cb.value)
      );
    });
    pset('pv-attachtype', labels.join('、'));
    pshow('pv-attachrow', labels.length > 0);
  } else {
    pshow('pv-attachrow', false);
  }
}

function getPaymentRecordTitle() {
  const applicant = gv('applicant') || '未填申請人';
  const category = gv('acctCategory') || '未填科目';
  const amount = gv('amtGross') ? 'NT$ ' + fmtNum(gv('amtGross')) : '未填金額';
  const date = gv('reqDate') || '未填日期';
  return `${applicant}｜${category}｜${amount}｜${date}`;
}

function saveRecentPaymentRecord() {
  const record = FormRecentRecords.save(
    'payment',
    getPaymentRecordTitle(),
    FormRecentRecords.collect(document.getElementById('fillPage')),
    window.__currentRecentPaymentRecordId || ''
  );
  window.__currentRecentPaymentRecordId = record.id;
}

function printAndSaveRecentPaymentRecord() {
  saveRecentPaymentRecord();
  window.print();
}

function loadRecentPaymentRecord() {
  const record = FormRecentRecords.pick('payment');
  if (!record) return;

  restorePaymentFormData(record.data);
  window.__currentRecentPaymentRecordId = record.id;
  window.__currentPaymentDraftId = '';
}

function savePaymentDraft() {
  const draft = FormRecentRecords.saveDraft(
    'payment',
    getPaymentRecordTitle(),
    FormRecentRecords.collect(document.getElementById('fillPage')),
    window.__currentPaymentDraftId || ''
  );
  if (!draft) return;

  window.__currentPaymentDraftId = draft.id;
  alert('草稿已儲存。');
}

function loadPaymentDraft() {
  const draft = FormRecentRecords.pickDraft('payment');
  if (!draft) return;

  restorePaymentFormData(draft.data);
  window.__currentPaymentDraftId = draft.id;
  window.__currentRecentPaymentRecordId = '';
}

function restorePaymentFormData(data) {
  FormRecentRecords.restore(data, document.getElementById('fillPage'));
  onAmtInput();
  syncPrintHeader();
  document.getElementById('previewPage').style.display = 'none';
  document.getElementById('fillPage').style.display = 'block';
  window.scrollTo(0, 0);
}

window.addEventListener('beforeprint', syncPrintHeader);
window.__currentRecentPaymentRecordId = '';
window.__currentPaymentDraftId = '';
