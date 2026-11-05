(() => {
  const { byId, value, radio, radioLabel, text, setValues, pick } = FormPage;
  const MAX_ITEMS = 15;
  const SIMPLE_ITEMS = 5;
  const FIELDS = ['Name', 'Spec', 'Qty', 'Unit', 'Price'];
  const indexes = Array.from({ length: MAX_ITEMS }, (_, index) => index + 1);
  const MAX_SUPPLIERS = 3;
  const SUPPLIER_FIELDS = ['Name', 'Contact', 'Quote'];
  const supplierIndexes = Array.from({ length: MAX_SUPPLIERS }, (_, index) => index + 1);
  let openRows = 1;
  let openSuppliers = 1;

  const isFilled = n => FIELDS.some(field => value(`item${n}${field}`));
  const isFull = () => radio('purchaseMode') === 'full';
  const itemLimit = () => (isFull() ? MAX_ITEMS : SIMPLE_ITEMS);
  const filledItems = () => indexes.filter(isFilled);
  const isComplete = n => value(`item${n}Name`) && Number(value(`item${n}Qty`)) > 0 && Number(value(`item${n}Price`)) > 0;
  const subtotal = () => filledItems().reduce((sum, n) => sum + FormCalc.lineAmount(value(`item${n}Qty`), value(`item${n}Price`)), 0);
  // The simple version prints one total, so its prices are taken as tax included.
  const totals = () => FormCalc.taxTotals(subtotal(), isFull() ? radio('taxBasis') : 'incl');
  const filledSuppliers = () => supplierIndexes.filter(n => SUPPLIER_FIELDS.some(field => value(`supplier${n}${field}`)));
  const recommendedSupplier = () => {
    const filled = filledSuppliers();
    return filled.length === 1 ? filled[0] : Number(radio('recommendedSupplier')) || 0;
  };
  const channelOf = n => radio(`supplier${n}Channel`);
  const channelText = n => ({ online: '網購', store: '實體' })[channelOf(n)] || '';
  const CHANNEL_HINTS = {
    online: ['選擇或輸入平台名稱', '賣場或商品網址（選填）'],
    store: ['輸入店家或廠商名稱', '門市、地址或聯絡人（選填）'],
    '': ['先選網購或實體', '賣場、網址或聯絡方式（選填）'],
  };
  const categoryText = () => (radio('category') === 'other' ? value('categoryOther') || '其他' : radioLabel('category'));

  function refresh() {
    byId('fillPage').classList.toggle('purchase-simple', !isFull());
    const lastFilled = filledItems().at(-1) || 0;
    openRows = Math.max(openRows, lastFilled, 1);
    indexes.forEach(n => {
      byId(`itemRow${n}`).style.display = n <= openRows ? '' : 'none';
      const amount = FormCalc.lineAmount(value(`item${n}Qty`), value(`item${n}Price`));
      byId(`item${n}Amount`).value = amount ? amount.toLocaleString('zh-TW') : '';
    });
    byId('addItem').disabled = openRows >= itemLimit();
    let itemHint = '';
    if (filledItems().length > itemLimit()) itemHint = `精簡版最多 ${SIMPLE_ITEMS} 項，請改用完整版或移除部分品項。`;
    else if (openRows >= itemLimit()) itemHint = isFull() ? `單張最多 ${MAX_ITEMS} 項，其餘請附清單並於備註說明。` : `精簡版最多 ${SIMPLE_ITEMS} 項，更多品項請改用完整版。`;
    text('addItemHint', itemHint);
    openSuppliers = Math.max(openSuppliers, filledSuppliers().at(-1) || 0, 1);
    supplierIndexes.forEach(n => {
      byId(`supplierRow${n}`).style.display = n <= openSuppliers ? '' : 'none';
      // Platform suggestions are online only and never restrict input; stores are always typed in.
      const name = byId(`supplier${n}Name`);
      if (channelOf(n) === 'online') name.setAttribute('list', 'supplierOptions');
      else name.removeAttribute('list');
      const [namePlaceholder, contactPlaceholder] = CHANNEL_HINTS[channelOf(n)];
      name.placeholder = namePlaceholder;
      byId(`supplier${n}Contact`).placeholder = contactPlaceholder;
    });
    byId('addSupplier').disabled = openSuppliers >= MAX_SUPPLIERS;
    text('addSupplierHint', openSuppliers >= MAX_SUPPLIERS ? `單張最多比較 ${MAX_SUPPLIERS} 家。` : '');
    const { net, tax, total } = totals();
    byId('amtNet').value = total ? FormCalc.money(net) : '';
    byId('amtTax').value = total ? FormCalc.money(tax) : '';
    byId('amtChinese').value = numToChinese(total);
    byId('amtBar').style.display = total ? 'flex' : 'none';
    text('amtBarNum', FormCalc.money(total));
    text('amtBarZh', numToChinese(total));
    text('amtBarBadge', radioLabel('taxBasis'));
  }

  window.addPurchaseItem = () => {
    openRows = Math.min(itemLimit(), openRows + 1);
    refresh();
    byId(`item${openRows}Name`).focus();
  };
  window.removePurchaseItem = n => {
    for (let row = n; row <= MAX_ITEMS; row += 1) {
      FIELDS.forEach(field => { byId(`item${row}${field}`).value = row < MAX_ITEMS ? byId(`item${row + 1}${field}`).value : ''; });
    }
    openRows = Math.max(1, openRows - 1);
    refresh();
  };

  window.addPurchaseSupplier = () => {
    openSuppliers = Math.min(MAX_SUPPLIERS, openSuppliers + 1);
    refresh();
    byId(`supplier${openSuppliers}Name`).focus();
  };
  window.removePurchaseSupplier = n => {
    const recommended = Number(radio('recommendedSupplier')) || 0;
    for (let row = n; row <= MAX_SUPPLIERS; row += 1) {
      pick(`supplier${row}Channel`, row < MAX_SUPPLIERS ? channelOf(row + 1) : '');
      SUPPLIER_FIELDS.forEach(field => { byId(`supplier${row}${field}`).value = row < MAX_SUPPLIERS ? byId(`supplier${row + 1}${field}`).value : ''; });
    }
    // The recommendation follows its supplier when rows shift up.
    pick('recommendedSupplier', String(recommended === n ? 0 : recommended > n ? recommended - 1 : recommended));
    openSuppliers = Math.max(1, openSuppliers - 1);
    refresh();
  };

  /* Simple prints on A5 landscape, full on A4 portrait. */
  const pageStyle = document.createElement('style');
  document.head.append(pageStyle);
  function setPaper() {
    const full = isFull();
    const sheet = byId('pvSheet');
    sheet.classList.toggle('pv-sheet-a4', full);
    sheet.classList.toggle('pv-sheet-simple', !full);
    const signoff = sheet.querySelector('[data-signoff]');
    signoff.dataset.signoff = full ? 'purchaseFull' : 'purchaseSimple';
    SignoffStore.render(signoff);
    const review = sheet.querySelector('[data-review]');
    review.dataset.review = signoff.dataset.signoff;
    ReviewStore.render(review);
    const showRows = rows => indexes.forEach(n => { byId(`pv-item${n}-row`).style.display = n <= rows ? '' : 'none'; });
    const filled = filledItems().length;
    if (full) {
      // Offer every blank row, dropping them only when long text needs the room.
      const page = byId('previewPage');
      const display = page.style.display;
      page.style.display = 'block'; // A hidden sheet has no height to measure.
      for (let rows = MAX_ITEMS; rows >= filled; rows -= 1) {
        showRows(rows);
        if (sheet.scrollHeight <= sheet.clientHeight + 1) break;
      }
      page.style.display = display;
    } else {
      showRows(Math.max(SIMPLE_ITEMS, filled));
    }
    // Loaded after the shared stylesheet, so this @page overrides its A5 default.
    pageStyle.textContent = full ? '@media print { @page { size: 210mm 297mm; margin: 0; } }' : '';
    text('pvPaperHint', full ? 'A4 直向 210 × 297 mm' : 'A5 橫向 210 × 148 mm');
  }

  function previewSuppliers() {
    const rows = filledSuppliers();
    const recommended = recommendedSupplier();
    supplierIndexes.forEach((n, position) => {
      const supplier = rows[position];
      // Blank rows are dropped so unused quotes do not take room on the A5 sheet.
      byId(`pv-sup${n}-row`).style.display = supplier || position === 0 ? '' : 'none';
      const quote = supplier ? Number(value(`supplier${supplier}Quote`)) : 0;
      text(`pv-sup${n}-rec`, supplier && supplier === recommended ? '建議' : '');
      text(`pv-sup${n}-channel`, supplier ? channelText(supplier) : '');
      text(`pv-sup${n}-name`, supplier ? value(`supplier${supplier}Name`) : '');
      text(`pv-sup${n}-contact`, supplier ? value(`supplier${supplier}Contact`) : '');
      text(`pv-sup${n}-quote`, quote ? FormCalc.money(quote) : '');
    });
  }

  function previewItems() {
    const rows = filledItems();
    indexes.forEach((n, position) => {
      const item = rows[position];
      const set = (field, content) => text(`pv-item${n}-${field}`, item ? content : '');
      set('no', String(n));
      set('name', value(`item${item}Name`));
      set('spec', value(`item${item}Spec`));
      set('qty', value(`item${item}Qty`));
      set('unit', value(`item${item}Unit`));
      set('price', Number(value(`item${item}Price`)).toLocaleString('zh-TW'));
      set('amount', FormCalc.lineAmount(value(`item${item}Qty`), value(`item${item}Price`)).toLocaleString('zh-TW'));
    });
  }

  FormPage.setup({
    type: 'purchase',
    label: '採購申請單',
    title() {
      const { total } = totals();
      return [value('applicant') || '未填申請人', value('item1Name') || categoryText() || '未填品項', total ? FormCalc.money(total) : '未填金額',
        FormCalc.slashDate(value('reqDate')) || '未填日期'].join('｜');
    },
    summaryFields: [['applicant', '申請人'], ['reqDate', '申請日期'], ['neededDate', '需求日期'], ['reason', '用途'], ['item1Name', '第一項品名'], ['supplier1Name', '第一家供應商'], ['remark', '備註']],
    sections: [
      [
        { id: 'reqDate', label: '申請日期' }, { id: 'applicant', label: '申請人' }, { id: 'department', label: '部門' }, { id: 'neededDate', label: '需求日期', when: isFull },
        { ok: () => !value('neededDate') || !value('reqDate') || value('neededDate') >= value('reqDate'), label: '需求日期不可早於申請日期', when: isFull },
      ],
      [
        { radio: 'category', label: '採購類別', when: isFull }, { id: 'categoryOther', label: '其他類別說明', when: () => isFull() && radio('category') === 'other' },
        { id: 'reason', label: '採購用途' },
      ],
      [
        { ok: () => filledItems().length > 0, label: '至少一項採購品項' },
        { ok: () => filledItems().every(isComplete), label: '每項品項都要填品名、數量與單價' },
        { ok: () => filledItems().length <= SIMPLE_ITEMS, label: `精簡版最多 ${SIMPLE_ITEMS} 項，請改用完整版`, when: () => !isFull() },
      ],
      [
        { ok: () => filledSuppliers().filter(n => isFull() || n === 1).every(channelOf), label: '請選擇網購或實體' },
        { ok: () => filledSuppliers().every(n => value(`supplier${n}Name`)), label: '每家比價廠商都要填名稱', when: isFull },
        { ok: () => filledSuppliers().includes(Number(radio('recommendedSupplier'))), label: '請選擇建議的比價廠商', when: () => isFull() && filledSuppliers().length > 1 },
        { radio: 'hasQuote', label: '是否附報價單', when: isFull },
        { ok: () => Number(value('quoteCount')) > 0, label: '報價單份數', when: () => isFull() && radio('hasQuote') === 'yes' },
      ],
    ],
    refresh,
    onReset() { openRows = 1; openSuppliers = 1; },
    onRestore() { openRows = 1; openSuppliers = 1; },
    preview() {
      const { net, tax, total } = totals();
      text('pv-reqdate', FormCalc.slashDate(value('reqDate')));
      text('pv-applicant', value('applicant'));
      text('pv-dept', value('department'));
      text('pv-neededdate', FormCalc.slashDate(value('neededDate')));
      text('pv-category', categoryText());
      text('pv-urgency', radioLabel('urgency'));
      text('pv-phone', value('contactPhone'));
      text('pv-reason', value('reason'));
      previewItems();
      text('pv-taxbasis', radioLabel('taxBasis'));
      text('pv-net', FormCalc.money(net));
      text('pv-tax', FormCalc.money(tax));
      text('pv-total', FormCalc.money(total));
      text('pv-chinese', numToChinese(total));
      previewSuppliers();
      text('pv-quote', radio('hasQuote') === 'yes' ? `有，${value('quoteCount')} 份` : '無');
      text('pv-remark', value('remark'));
      text('pv-channel', [channelText(1), value('supplier1Name')].filter(Boolean).join('：'));
      text('pv-channel-link', value('supplier1Contact'));
      setPaper();
    },
    sample() {
      const fixed = { applicant: '陳小華', department: '行銷部' };
      if (!isFull()) {
        setValues({
          ...fixed, reason: '補充辦公室文具',
          item1Name: '原子筆', item1Spec: '0.5 黑', item1Qty: '12', item1Unit: '支', item1Price: '15',
          item2Name: 'A4 影印紙', item2Spec: '80 磅', item2Qty: '5', item2Unit: '包', item2Price: '120',
          supplier1Name: '蝦皮購物', supplier1Contact: '辦公用品專賣賣場',
        });
        pick('supplier1Channel', 'online');
        return;
      }
      const needed = FormCalc.parseDate(FormCalc.localDate());
      needed.setDate(needed.getDate() + 14);
      setValues({
        ...fixed, neededDate: FormCalc.localDate(needed), contactPhone: '0912-345-678',
        reason: '新進人員到職使用，並汰換故障設備',
        item1Name: '筆記型電腦', item1Spec: '14 吋 / 16GB / 512GB', item1Qty: '2', item1Unit: '台', item1Price: '32000',
        item2Name: '27 吋螢幕', item2Spec: 'QHD', item2Qty: '2', item2Unit: '台', item2Price: '8500',
        supplier1Name: '範例資訊股份有限公司', supplier1Contact: '張業務 02-2345-6789', supplier1Quote: '85050',
        supplier2Name: 'PChome 24h購物', supplier2Contact: '官方商品頁', supplier2Quote: '83500',
        quoteCount: '2', remark: '報價較高但保固多 1 年，建議選擇範例資訊。',
      });
      pick('category', 'equipment');
      pick('taxBasis', 'excl');
      pick('hasQuote', 'yes');
      pick('recommendedSupplier', '1');
      pick('supplier1Channel', 'store');
      pick('supplier2Channel', 'online');
    },
  });
})();
