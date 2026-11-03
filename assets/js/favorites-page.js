document.addEventListener('DOMContentLoaded', () => {
  const panels = [...document.querySelectorAll('[data-favorites-panel]')];
  const links = [...document.querySelectorAll('.favorites-tabs a')];
  function activate() {
    const id = panels.some(panel => `#${panel.id}` === location.hash) ? location.hash : '#profile-manager';
    panels.forEach(panel => { panel.hidden = `#${panel.id}` !== id; });
    links.forEach(link => {
      if (link.getAttribute('href') === id) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
  window.addEventListener('hashchange', activate);
  window.addEventListener('popstate', activate);
  links.forEach(link => link.addEventListener('click', event => {
    event.preventDefault();
    if (location.hash !== link.hash) history.pushState(null, '', link.hash);
    activate();
    document.querySelector('.favorites-tabs').scrollIntoView({ block: 'start' });
  }));
  activate();
});
