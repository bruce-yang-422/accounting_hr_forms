/* Default applicant autofill and a searchable, paginated profile picker. */
document.addEventListener('DOMContentLoaded', () => {
  const applicant = document.getElementById('applicant');
  if (!applicant) return;
  const mapping = { applicant: 'name', department: 'department', jobTitle: 'jobTitle', agent: 'agent', contactPhone: 'contactPhone' };
  function apply(profile, overwrite) {
    Object.entries(mapping).forEach(([id, key]) => {
      const field = document.getElementById(id);
      if (field && (overwrite || !field.value)) {
        field.value = profile[key] || '';
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }
  const defaultProfile = ProfileStore.getDefault();
  let defaultId = defaultProfile?.id || '';
  if (defaultProfile) apply(defaultProfile, false);
  const wrap = document.createElement('div'); wrap.className = 'profile-pick-wrap';
  applicant.before(wrap); wrap.append(applicant);
  const picker = FavoritesUI.picker({
    title: '選擇個人常用資料', manageUrl: '../favorites.html#profile-manager',
    placeholder: '搜尋姓名、單位、職稱或電話', name: record => record.name,
    searchText: record => Object.values(record).join(' '),
    description: record => [record.department, record.jobTitle].filter(Boolean).join('・'),
    filters: [{ label: '單位', value: record => record.department }],
    load: () => { defaultId = ProfileStore.getDefault()?.id || ''; return ProfileStore.getAll(); },
    priority: record => Number(record.id === defaultId),
    defaultSortLabel: '預設人員優先，再依姓名',
    onSelect(record) {
      const latest = ProfileStore.getAll().find(item => item.id === record.id);
      if (!latest) throw new Error('這筆資料已被刪除，請重新搜尋。');
      apply(latest, true);
    },
  });
  const button = FavoritesUI.button('常用資料', picker.open, 'profile-pick-btn');
  button.setAttribute('aria-haspopup', 'dialog'); wrap.append(button);
  const link = document.createElement('a'); link.className = 'favorites-backup-link';
  link.href = '../favorites.html#profile-manager'; link.textContent = '管理個人資料／JSON 備份'; wrap.after(link);
  link.target = '_blank'; link.rel = 'noopener'; link.title = '另開分頁管理，保留目前表單內容';
  window.addEventListener('storage', event => { if (event.key === null || event.key === 'yijia_profiles') picker.refresh(); });
});
