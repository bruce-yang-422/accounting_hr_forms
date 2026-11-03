document.addEventListener('DOMContentLoaded', () => {
  const { node, button } = FavoritesUI;
  const form = document.getElementById('pm-form');
  const status = document.getElementById('pm-status');
  const formStatus = document.getElementById('pm-form-status');
  const fields = Object.fromEntries(Object.entries({ name: 'pm-name', department: 'pm-dept', jobTitle: 'pm-title', agent: 'pm-agent', contactPhone: 'pm-phone' })
    .map(([key, id]) => [key, document.getElementById(id)]));
  const editor = FavoritesUI.editor(form, '新增個人資料'); form.hidden = false;
  let editingId = '', defaultId = '';
  function openEditor(record) {
    form.reset(); formStatus.textContent = ''; editingId = record?.id || '';
    Object.entries(fields).forEach(([key, field]) => { field.value = record?.[key] || ''; });
    editor.open(record ? `編輯個人資料：${record.name}` : '新增個人資料');
  }
  const browser = FavoritesUI.createBrowser(document.getElementById('profile-browser'), {
    placeholder: '輸入姓名、單位、職稱或電話，搜尋全部個人資料',
    name: record => record.name, searchText: record => Object.values(record).join(' '),
    filters: [{ label: '單位', value: record => record.department }],
    priority: record => Number(record.id === defaultId), defaultSortLabel: '預設人員優先，再依姓名',
    emptyTitle: '還沒有個人常用資料', emptyText: '新增後，請假單與請款單都可以帶入使用。',
    createLabel: '新增個人資料', onCreate: () => openEditor(),
    renderItem(record) {
      const card = node('article', `fm-record${record.id === defaultId ? ' is-default' : ''}`);
      const info = node('div', 'fm-record-info');
      info.append(node('h3', '', record.name), node('p', '', [record.department, record.jobTitle].filter(Boolean).join('・')));
      const detail = node('details'); detail.append(node('summary', '', '查看聯絡與代理資料'),
        node('p', '', `代理人：${record.agent || '未填寫'}　電話：${record.contactPhone || '未填寫'}`)); info.append(detail);
      const actions = node('div', 'fm-record-actions');
      actions.append(record.id === defaultId ? node('span', 'pm-default-badge', '預設') : button('設為預設', () => {
        try { ProfileStore.setDefault(record.id); refresh(); status.textContent = `已將「${record.name}」設為預設人員。`; } catch (error) { status.textContent = error.message; }
      }));
      const confirm = node('div', 'fm-confirm');
      actions.append(button('編輯', () => {
        try {
          const latest = ProfileStore.getAll().find(item => item.id === record.id);
          if (!latest) throw new Error('這筆資料已不存在，請重新選取。');
          openEditor(latest);
        } catch (error) { status.textContent = error.message; }
      }), button('刪除', () => {
        confirm.replaceChildren(node('p', '', `確定刪除「${record.name}」？${record.id === defaultId ? '刪除後會改用其他人員為預設。' : ''}`),
          button('確定刪除', () => {
            try { ProfileStore.remove(record.id); refresh(); status.textContent = `已刪除「${record.name}」。`; } catch (error) { status.textContent = error.message; }
          }, 'fm-button fm-danger'), button('取消', () => confirm.replaceChildren()));
      }, 'fm-button fm-danger'));
      card.append(info, actions, confirm); return card;
    },
  });
  function refresh() {
    try { defaultId = ProfileStore.getDefault()?.id || ''; browser.setRecords(ProfileStore.getAll()); }
    catch (error) { status.textContent = `無法讀取資料：${error.message}`; }
  }
  document.getElementById('pm-new').addEventListener('click', () => openEditor());
  document.getElementById('pm-cancel-btn').addEventListener('click', editor.requestClose);
  form.addEventListener('submit', event => {
    event.preventDefault();
    try {
      const profile = Object.fromEntries(Object.entries(fields).map(([key, field]) => [key, field.value.trim()]));
      if (!profile.name || !profile.department) throw new Error('請填寫姓名與單位。');
      const id = editingId || ProfileStore.add(profile);
      if (editingId) ProfileStore.update(id, profile);
      editor.close(); refresh(); browser.reveal(profile);
      status.textContent = `已${editingId ? '更新' : '新增'}「${profile.name}」。`;
    } catch (error) { formStatus.textContent = `無法儲存：${error.message}`; }
  });
  window.addEventListener('favorites-imported', refresh);
  window.addEventListener('storage', event => { if (event.key === null || event.key === 'yijia_profiles') refresh(); });
  refresh();
});
