/**
 * profile-store.js
 * Shared localStorage helper for personal profile data.
 * Schema: { profiles: Profile[], defaultId: string|null }
 * Profile: { id, name, department, jobTitle, isDefault }
 */

const ProfileStore = (() => {
  const KEY = 'yijia_profiles';

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || { profiles: [], defaultId: null };
    } catch {
      return { profiles: [], defaultId: null };
    }
  }

  function save(data) {
    localStorage.setItem(KEY, JSON.stringify(data));
  }

  function getAll() {
    return load().profiles;
  }

  function getDefault() {
    const data = load();
    const profiles = data.profiles;
    if (!profiles.length) return null;
    if (profiles.length === 1) return profiles[0];
    const def = profiles.find(p => p.id === data.defaultId);
    return def || profiles[0];
  }

  function add(profile) {
    const data = load();
    const id = 'p_' + Date.now();
    const newProfile = { id, ...profile };
    data.profiles.push(newProfile);
    if (data.profiles.length === 1) data.defaultId = id;
    save(data);
    return id;
  }

  function remove(id) {
    const data = load();
    data.profiles = data.profiles.filter(p => p.id !== id);
    if (data.defaultId === id) {
      data.defaultId = data.profiles.length ? data.profiles[0].id : null;
    }
    save(data);
  }

  function setDefault(id) {
    const data = load();
    data.defaultId = id;
    save(data);
  }

  function update(id, fields) {
    const data = load();
    const p = data.profiles.find(p => p.id === id);
    if (p) Object.assign(p, fields);
    save(data);
  }

  return { getAll, getDefault, add, remove, setDefault, update };
})();
