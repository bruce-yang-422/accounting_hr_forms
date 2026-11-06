/* Print an untouched form skeleton without clearing or saving the user's work. */
window.BlankFormPrint = (() => {
  const fill = document.getElementById('fillPage');
  const preview = document.getElementById('previewPage');
  const sheets = [...preview.querySelectorAll('.pv-sheet')];
  // Capture before the first preview writes dates, calculated values or personal data.
  const skeletons = new Map(sheets.map(sheet => [sheet, sheet.cloneNode(true)]));
  let enabled = false;
  let blankSheet = null;
  let toggle;

  function remove() {
    blankSheet?.remove(); blankSheet = null;
    sheets.forEach(sheet => sheet.classList.remove('blank-print-original'));
  }

  function render() {
    remove();
    if (!enabled) return;
    const source = sheets.find(sheet => !sheet.hidden);
    if (!source) return;
    blankSheet = skeletons.get(source).cloneNode(true);
    blankSheet.className = source.className;
    blankSheet.classList.add('blank-print-sheet');
    blankSheet.hidden = false;

    // Keep current, user-configured review/signature headings in every layout.
    for (const attribute of ['signoff', 'review']) {
      const blocks = [...blankSheet.querySelectorAll(`[data-${attribute}]`)];
      const live = [...source.querySelectorAll(`[data-${attribute}]`)];
      blocks.forEach((block, index) => {
        block.dataset[attribute] = live[index]?.dataset[attribute] || block.dataset[attribute];
        if (attribute === 'signoff') SignoffStore.render(block);
        else ReviewStore.render(block);
      });
    }

    // Blank purchase sheets offer all the writing rows for the selected paper size.
    blankSheet.querySelectorAll('[id^="pv-item"][id$="-row"]').forEach((row, index) => {
      row.style.display = !source.classList.contains('pv-sheet-simple') || index < 5 ? '' : 'none';
    });
    blankSheet.querySelectorAll('[id^="pv-sup"][id$="-row"]').forEach(row => { row.style.display = ''; });
    const paid = blankSheet.querySelector('#pv-paid');
    if (paid) paid.hidden = true;
    const bank = blankSheet.querySelector('#pv-transfer');
    if (bank) bank.hidden = false;
    const taxBoxes = blankSheet.querySelector('#pv-sellerTaxId');
    if (taxBoxes) {
      taxBoxes.replaceChildren();
      for (let i = 0; i < 8; i += 1) taxBoxes.append(document.createElement('span'));
    }
    const date = blankSheet.querySelector('.receipt-date, .sr-meta #pv-date');
    if (date) date.textContent = '中華民國　　　 年　　 月　　 日';

    // Remove IDs so native preview/print handlers continue targeting only the filled sheet.
    blankSheet.querySelectorAll('[id]').forEach(element => {
      element.dataset.blankField = element.id;
      element.removeAttribute('id');
    });
    blankSheet.id = 'blankPrintSheet';
    sheets.forEach(sheet => sheet.classList.add('blank-print-original'));
    source.parentNode.append(blankSheet);
  }

  const build = window.buildPreview;
  const next = window.goToPreview;
  window.goToPreview = function () {
    if (!enabled) return next();
    // Native rendering selects the correct sheet, paper size and purchase mode.
    build();
    render();
    fill.style.display = 'none'; preview.style.display = 'block';
    window.scrollTo(0, 0);
    const notice = document.getElementById('pvOverflow');
    if (notice && blankSheet) notice.hidden = blankSheet.scrollHeight <= blankSheet.clientHeight + 1;
  };
  const validate = window.validateForm;
  window.validateForm = () => enabled ? [] : validate();

  // Blank paper is not a completed transaction and must not enter recent records.
  for (const name of ['printRecord', 'printAndSaveRecentLeaveRecord', 'printAndSaveRecentPaymentRecord']) {
    const print = window[name];
    if (typeof print === 'function') window[name] = () => enabled ? window.print() : print();
  }
  window.addEventListener('beforeprint', render);

  function setEnabled(value) {
    enabled = Boolean(value);
    toggle?.setAttribute('aria-pressed', String(enabled));
    toggle?.setAttribute('title', enabled ? '已選空白單，不必填寫即可預覽與列印；再按一次取消' : '保留格線及欄位名稱，列印後手寫');
    remove();
    if (preview.style.display === 'block') { build(); render(); }
    fill.dispatchEvent(new Event('input', { bubbles: true }));
  }

  document.addEventListener('DOMContentLoaded', () => {
    let control = fill.querySelector('.leave-layout-control');
    if (!control) {
      control = document.createElement('div'); control.className = 'blank-print-control';
      const label = document.createElement('span'); label.className = 'blank-print-label'; label.textContent = '列印選項';
      control.append(label);
      const doc = fill.querySelector('.form-doc-number');
      doc.before(control);
      // Keep the option with document settings when the desktop sidebar is built.
      const group = document.createElement('div'); group.className = 'leave-document-controls blank-print-document-controls';
      control.before(group); group.append(control, doc);
    }
    toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'blank-print-toggle';
    toggle.textContent = '空白單（手寫用）'; toggle.setAttribute('aria-pressed', 'false');
    toggle.title = '保留格線及欄位名稱，列印後手寫';
    toggle.addEventListener('click', () => setEnabled(!enabled)); control.append(toggle);
  });

  return { active: () => enabled, setEnabled };
})();
