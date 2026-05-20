/**
 * profile-autofill.js
 * Auto-fills form fields from the default profile on page load.
 * Include after profile-store.js on each form page.
 *
 * Field mapping (by element id):
 *   applicant  → profile.name
 *   department → profile.department
 *   jobTitle   → profile.jobTitle  (leave form only; safe to skip if absent)
 */

document.addEventListener('DOMContentLoaded', () => {
  const profile = ProfileStore.getDefault();
  if (!profile) return;

  const fill = (id, value) => {
    const el = document.getElementById(id);
    if (el && !el.value && value) el.value = value;
  };

  fill('applicant',  profile.name);
  fill('department', profile.department);
  fill('jobTitle',   profile.jobTitle);
});
