/* Compact mobile toolbar. Reuses the desktop controls so actions stay in sync. */
(() => {
  const toolbar = document.querySelector('#fillPage .toolbar');
  const toggle = document.getElementById('toolbarMore');
  const panel = document.getElementById('toolbarSecondary');
  const mobile = window.matchMedia('(max-width: 660px)');
  function close(focus = false) {
    toggle.setAttribute('aria-expanded', 'false');
    panel.hidden = mobile.matches;
    if (focus) toggle.focus();
  }
  function sync() {
    close();
    document.querySelectorAll('[data-mobile-collapse]').forEach(details => { details.open = !mobile.matches; });
  }
  toggle.addEventListener('click', () => {
    if (toggle.getAttribute('aria-expanded') === 'true') close(true);
    else {
      panel.hidden = false;
      toggle.setAttribute('aria-expanded', 'true');
      panel.querySelector('button, a')?.focus();
    }
  });
  panel.addEventListener('click', event => {
    if (mobile.matches && event.target.closest('button, a')) close(true);
  }, true);
  document.addEventListener('click', event => { if (!toolbar.contains(event.target)) close(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { event.preventDefault(); close(true); }
  });
  document.addEventListener('focusin', event => { if (!toolbar.contains(event.target)) close(); });
  mobile.addEventListener('change', sync);
  sync();
})();
