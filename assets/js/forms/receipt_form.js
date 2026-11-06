(() => {
  const { byId, value, text, setValues } = FormPage;
  const indices = Array.from({ length: 7 }, (_, i) => i + 1);
  const used = i => ['Name', 'Qty', 'Price'].some(key => value(`item${i}${key}`));
  const amount = i => Math.round(Number(value(`item${i}Qty`)) * Number(value(`item${i}Price`)) * 100) / 100;
  const total = () => indices.reduce((sum, i) => sum + (used(i) ? Math.round(amount(i) * 100) : 0), 0) / 100;
  const format = number => Number.isFinite(number) ? number.toLocaleString('zh-TW', { maximumFractionDigits: 2 }) : '';
  const validItem = i => !used(i) || (value(`item${i}Name`) &&
    Number(value(`item${i}Qty`)) > 0 && Number(value(`item${i}Qty`)) <= 999999 &&
    value(`item${i}Price`) !== '' && Number(value(`item${i}Price`)) >= 0 && Number(value(`item${i}Price`)) <= 999999999 &&
    byId(`item${i}Qty`).validity.valid && byId(`item${i}Price`).validity.valid);

  FormPage.setup({
    type: 'receipt', label: '免用統一發票收據',
    title: () => [value('buyer') || '未填買受人', `NT$ ${format(total())}`, value('reqDate'), value('docNo')].filter(Boolean).join('｜'),
    summaryFields: [['buyer', '買受人'], ['reqDate', '開立日期'], ['sellerTaxId', '開立人統編'], ['amountTotal', '合計'], ['reason', '備註']],
    sections: [
      [{ id: 'buyer', label: '買受人' }, { id: 'reqDate', label: '開立日期' },
        { ok: () => byId('reqDate').validity.valid, label: '開立日期格式不正確' },
        ...['sellerTaxId', 'buyerTaxId'].map(id => ({ ok: () => !value(id) || /^\d{8}$/.test(value(id)), label: `${id === 'sellerTaxId' ? '開立人' : '買受人'}統一編號須為 8 碼數字` }))],
      [{ ok: () => indices.some(used), label: '至少填寫一項品名、數量與單價' },
        ...indices.map(i => ({ ok: () => validItem(i), label: `第 ${i} 項須填寫品名、正數數量及非負單價（最多兩位小數）` })),
        { ok: () => Number.isFinite(total()) && total() > 0 && total() < 1e12, label: '合計須大於零且小於一兆元' }],
      [],
    ],
    refresh() {
      indices.forEach(i => { byId(`item${i}Total`).value = used(i) ? format(amount(i)) : ''; });
      byId('amountTotal').value = total() ? format(total()) : '';
      byId('amountChinese').value = total() > 0 && total() < 1e12 ? numToChinese(total()) : '';
    },
    preview() {
      const [year, month, day] = value('reqDate').split('-').map(Number);
      text('pv-date', `中華民國 ${year - 1911} 年 ${month} 月 ${day} 日`);
      const boxes = byId('pv-sellerTaxId'); boxes.replaceChildren();
      Array.from({ length: 8 }, (_, i) => {
        const box = document.createElement('span'); box.textContent = value('sellerTaxId')[i] || ''; boxes.append(box);
      });
      ['buyer', 'buyerAddress', 'buyerTaxId', 'reason'].forEach(id => text(`pv-${id}`, value(id)));
      byId('pv-buyerTaxRow').hidden = !value('buyerTaxId');
      indices.forEach(i => {
        text(`pv-item${i}Name`, value(`item${i}Name`));
        ['Qty', 'Price'].forEach(key => text(`pv-item${i}${key}`, value(`item${i}${key}`) !== '' ? format(Number(value(`item${i}${key}`))) : ''));
        text(`pv-item${i}Total`, used(i) ? format(amount(i)) : '');
      });
      text('pv-amountChinese', byId('amountChinese').value);
      byId('pv-paid').hidden = !byId('paid').checked;
    },
    sample() {
      setValues({ buyer: '範例有限公司', buyerAddress: '臺北市中正區範例路 1 號',
        item1Name: '文具用品', item1Qty: '2', item1Price: '150',
        item2Name: '影印紙', item2Qty: '3', item2Price: '120' });
    },
  });
})();
