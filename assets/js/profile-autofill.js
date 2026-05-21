/**
 * profile-autofill.js
 * Auto-fills form fields from the default profile on page load.
 * Include after profile-store.js on each form page.
 *
 * Field mapping (by element id):
 *   applicant  → profile.name
 *   department → profile.department
 *   jobTitle   → profile.jobTitle  (leave form only; safe to skip if absent)
 *   agent      → profile.agent      (leave form only; safe to skip if absent)
 *   contactPhone → profile.contactPhone (leave form only; safe to skip if absent)
 */

document.addEventListener('DOMContentLoaded', () => {
  const profile = ProfileStore.getDefault();
  const profiles = ProfileStore.getAll();

  const fill = (id, value) => {
    const el = document.getElementById(id);
    if (el && !el.value && value) el.value = value;
  };

  const applyProfile = (selectedProfile, overwrite = false) => {
    const apply = (id, value) => {
      const el = document.getElementById(id);
      if (!el || !value) return;
      if (overwrite || !el.value) {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    };

    apply('applicant', selectedProfile.name);
    apply('department', selectedProfile.department);
    apply('jobTitle', selectedProfile.jobTitle);
    apply('agent', selectedProfile.agent);
    apply('contactPhone', selectedProfile.contactPhone);
  };

  if (profile) {
    fill('applicant', profile.name);
    fill('department', profile.department);
    fill('jobTitle', profile.jobTitle);
    fill('agent', profile.agent);
    fill('contactPhone', profile.contactPhone);
  }

  createProfilePicker(profiles, applyProfile);
});

function createProfilePicker(profiles, applyProfile) {
  const applicantEl = document.getElementById('applicant');
  if (!applicantEl || applicantEl.closest('.profile-pick-wrap')) return;

  const wrap = document.createElement('div');
  wrap.className = 'profile-pick-wrap';
  applicantEl.parentNode.insertBefore(wrap, applicantEl);
  wrap.appendChild(applicantEl);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'profile-pick-btn';
  btn.textContent = '常用資料';
  btn.title = profiles.length ? '從常用資料帶入' : '尚無常用資料';
  btn.disabled = !profiles.length;
  wrap.appendChild(btn);

  if (!profiles.length) return;

  const menu = document.createElement('div');
  menu.className = 'profile-pick-menu';
  menu.hidden = true;
  wrap.appendChild(menu);

  profiles.forEach((profile) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'profile-pick-item';
    item.innerHTML = `
      <span class="profile-pick-name">${esc(profile.name)}</span>
      <span class="profile-pick-meta">${esc([profile.department, profile.jobTitle].filter(Boolean).join('・'))}</span>
    `;
    item.addEventListener('click', () => {
      applyProfile(profile, true);
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
      applicantEl.focus();
    });
    menu.appendChild(item);
  });

  btn.setAttribute('aria-haspopup', 'menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    btn.setAttribute('aria-expanded', String(open));
  });

  document.addEventListener('click', (event) => {
    if (!wrap.contains(event.target)) {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      menu.hidden = true;
      btn.setAttribute('aria-expanded', 'false');
    }
  });
}

function esc(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
