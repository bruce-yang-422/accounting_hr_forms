/**
 * profile-manager.js
 * Drives the profile management UI on index.html.
 */

document.addEventListener('DOMContentLoaded', () => {
  const listEl   = document.getElementById('pm-list');
  const formEl   = document.getElementById('pm-form');
  const nameEl   = document.getElementById('pm-name');
  const deptEl   = document.getElementById('pm-dept');
  const titleEl  = document.getElementById('pm-title');
  const agentEl  = document.getElementById('pm-agent');
  const phoneEl  = document.getElementById('pm-phone');
  const addBtn   = document.getElementById('pm-add-btn');
  const cancelBtn = document.getElementById('pm-cancel-btn');
  const emptyEl  = document.getElementById('pm-empty');

  let editingId = null;

  function render() {
    const profiles = ProfileStore.getAll();
    const def = ProfileStore.getDefault();
    listEl.innerHTML = '';

    if (!profiles.length) {
      emptyEl.style.display = 'block';
      return;
    }
    emptyEl.style.display = 'none';

    profiles.forEach(p => {
      const isDefault = def && def.id === p.id;
      const meta = [p.department, p.jobTitle, p.agent ? `代理：${p.agent}` : '', p.contactPhone]
        .filter(Boolean)
        .map(esc)
        .join('・');
      const card = document.createElement('div');
      card.className = 'pm-card' + (isDefault ? ' pm-card--default' : '');
      card.innerHTML = `
        <div class="pm-card-info">
          <span class="pm-card-name">${esc(p.name)}</span>
          <span class="pm-card-meta">${meta}</span>
        </div>
        <div class="pm-card-actions">
          ${!isDefault ? `<button class="pm-btn pm-btn--default" data-id="${p.id}" title="設為預設">設為預設</button>` : '<span class="pm-default-badge">預設</span>'}
          <button class="pm-btn pm-btn--edit" data-id="${p.id}" title="編輯">編輯</button>
          <button class="pm-btn pm-btn--del" data-id="${p.id}" title="刪除">刪除</button>
        </div>
      `;
      listEl.appendChild(card);
    });

    listEl.querySelectorAll('.pm-btn--default').forEach(btn =>
      btn.addEventListener('click', () => { ProfileStore.setDefault(btn.dataset.id); render(); })
    );
    listEl.querySelectorAll('.pm-btn--del').forEach(btn =>
      btn.addEventListener('click', () => {
        if (confirm('確定刪除這筆資料？')) { ProfileStore.remove(btn.dataset.id); render(); }
      })
    );
    listEl.querySelectorAll('.pm-btn--edit').forEach(btn =>
      btn.addEventListener('click', () => startEdit(btn.dataset.id))
    );
  }

  function startEdit(id) {
    const p = ProfileStore.getAll().find(p => p.id === id);
    if (!p) return;
    editingId = id;
    nameEl.value  = p.name;
    deptEl.value  = p.department;
    titleEl.value = p.jobTitle || '';
    agentEl.value = p.agent || '';
    phoneEl.value = p.contactPhone || '';
    addBtn.textContent = '儲存';
    cancelBtn.style.display = 'inline-flex';
    nameEl.focus();
    formEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function resetForm() {
    editingId = null;
    nameEl.value = deptEl.value = titleEl.value = agentEl.value = phoneEl.value = '';
    addBtn.textContent = '新增';
    cancelBtn.style.display = 'none';
  }

  addBtn.addEventListener('click', () => {
    const name  = nameEl.value.trim();
    const dept  = deptEl.value.trim();
    const title = titleEl.value.trim();
    const agent = agentEl.value.trim();
    const contactPhone = phoneEl.value.trim();
    if (!name || !dept) {
      if (!name) nameEl.classList.add('fi--error');
      if (!dept) deptEl.classList.add('fi--error');
      return;
    }
    nameEl.classList.remove('fi--error');
    deptEl.classList.remove('fi--error');

    const profile = { name, department: dept, jobTitle: title, agent, contactPhone };
    if (editingId) {
      ProfileStore.update(editingId, profile);
    } else {
      ProfileStore.add(profile);
    }
    resetForm();
    render();
  });

  cancelBtn.addEventListener('click', () => resetForm());

  [nameEl, deptEl].forEach(el =>
    el.addEventListener('input', () => el.classList.remove('fi--error'))
  );

  function esc(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  render();
});
