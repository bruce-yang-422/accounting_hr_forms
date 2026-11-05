/* Desktop workspace; existing form controls and mobile toolbar remain shared. */
document.addEventListener('DOMContentLoaded', () => {
  const root = document.getElementById('fillPage');
  if (!root) return;
  const main = root.querySelector('.main');
  const tools = document.getElementById('toolbarSecondary');
  const toolsHome = tools.parentNode;
  const breakpoint = window.matchMedia('(min-width: 1024px)');
  const cards = [...main.querySelectorAll('.card')];
  const payment = !!document.getElementById('payee');
  const make = (tag, className, text) => {
    const el = document.createElement(tag); el.className = className;
    if (text) el.textContent = text;
    return el;
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'ui-icon'); svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    const use = document.createElementNS(svg.namespaceURI, 'use');
    use.setAttribute('href', `#icon-${name}`); svg.append(use); return svg;
  }
  const aside = make('aside', 'form-sidebar'); aside.id = 'formSidebar';
  aside.setAttribute('aria-label', '表單導覽與工具');
  const collapse = make('button', 'sidebar-collapse'); collapse.type = 'button';
  collapse.append(icon('menu'), make('span', 'sidebar-label', '收合側欄'));
  collapse.setAttribute('aria-expanded', 'true'); collapse.setAttribute('aria-controls', 'formSidebarContent');
  collapse.title = '收合側欄';
  const sidebarContent = make('div', 'sidebar-content'); sidebarContent.id = 'formSidebarContent';
  const progress = make('div', 'sidebar-progress');
  const progressLabel = make('p', 'sidebar-label', '必填區段進度');
  const meter = make('progress', 'workspace-progress'); meter.max = cards.length;
  meter.setAttribute('aria-label', '已完成必填欄位的區段數');
  const progressText = make('span', 'sidebar-label');
  progress.append(progressLabel, meter, progressText);
  const nav = make('nav', 'section-nav'); nav.setAttribute('aria-label', '表單區段');
  const links = cards.map((card, index) => {
    card.id = `form-section-${index + 1}`;
    const heading = card.querySelector('h2'); heading.id = `form-heading-${index + 1}`;
    card.setAttribute('role', 'region'); card.setAttribute('aria-labelledby', heading.id);
    card.tabIndex = -1;
    const link = make('a', 'section-link'); link.href = `#${card.id}`;
    link.title = `${index + 1}. ${heading.textContent}`;
    const number = make('span', 'section-number', String(index + 1));
    const state = make('span', 'section-state'); state.setAttribute('aria-hidden', 'true');
    link.append(number, make('span', 'sidebar-label', heading.textContent), state);
    link.addEventListener('click', event => {
      event.preventDefault(); card.scrollIntoView({ block: 'start' }); card.focus({ preventScroll: true });
      activate(index);
    });
    nav.append(link); return link;
  });
  const toolSlot = make('div', 'sidebar-tools');
  const resource = make('a', 'sidebar-resource'); resource.href = '../favorites.html'; resource.target = '_blank'; resource.rel = 'noopener';
  resource.append(icon('user'), make('span', 'sidebar-label', '常用資料管理')); resource.title = '常用資料管理（另開分頁）';
  const guide = make('a', 'sidebar-resource'); guide.href = '../guide.html'; guide.target = '_blank'; guide.rel = 'noopener';
  guide.append(icon('book'), make('span', 'sidebar-label', '填寫說明')); guide.title = '填寫說明（另開分頁）';
  sidebarContent.append(progress, nav, make('p', 'sidebar-heading sidebar-label', '表單工具'), toolSlot, resource, guide);
  aside.append(collapse, sidebarContent); root.insertBefore(aside, main);
  const context = make('div', 'desktop-form-context');
  const help = main.querySelector('.form-help');
  context.append(main.querySelector('.draft-session'), help, main.querySelector('.leave-document-controls') || main.querySelector('.form-doc-number'));
  main.prepend(context);
  if (breakpoint.matches) help.open = false;
  const fillCheck = make('button', 'desktop-fill-check'); fillCheck.type = 'button';
  fillCheck.addEventListener('click', () => window.goToPreview());
  root.querySelector('.toolbar-inner').append(fillCheck);
  const bottom = make('div', 'desktop-form-actions'); bottom.setAttribute('aria-label', '表單操作');
  const bottomSecondary = make('div', 'desktop-action-secondary');
  const preview = make('button', 'btn desktop-preview', '檢查並預覽'); preview.type = 'button';
  preview.append(icon('arrow-right')); preview.addEventListener('click', () => window.goToPreview());
  bottom.append(bottomSecondary, preview); main.append(bottom);
  const moved = [];
  tools.querySelectorAll('button, a').forEach(control => {
    const label = make('span', 'sidebar-label');
    // Wrap text without replacing the live buttons used by the library counters.
    while (control.firstChild) label.append(control.firstChild);
    const name = control.hasAttribute('data-draft-library') ? 'forms' : control.hasAttribute('data-template-library') ? 'book' :
      control.hasAttribute('data-recent-library') ? 'clock' : control.tagName === 'A' ? 'home' : /clearForm/.test(control.getAttribute('onclick')) ? 'trash' : 'edit';
    control.append(icon(name), label);
    if (/fillSample|clearForm/.test(control.getAttribute('onclick') || '')) moved.push(control);
  });
  const homes = moved.map(control => ({ control, next: control.nextSibling }));
  function layout() {
    if (breakpoint.matches) {
      toolSlot.append(tools); tools.hidden = false;
      moved.forEach(control => bottomSecondary.append(control));
    } else {
      [...homes].reverse().forEach(({ control, next }) => tools.insertBefore(control, next?.parentNode === tools ? next : null));
      toolsHome.insertBefore(tools, toolsHome.firstChild);
      tools.hidden = window.matchMedia('(max-width: 660px)').matches;
      document.getElementById('toolbarMore').setAttribute('aria-expanded', 'false');
    }
  }
  collapse.addEventListener('click', () => {
    const compact = root.classList.toggle('sidebar-compact');
    collapse.setAttribute('aria-expanded', String(!compact));
    collapse.title = compact ? '展開側欄' : '收合側欄';
    collapse.querySelector('span').textContent = collapse.title;
    collapse.setAttribute('aria-label', collapse.title);
  });
  function activate(index) {
    links.forEach((link, i) => {
      if (i === index) link.setAttribute('aria-current', 'step'); else link.removeAttribute('aria-current');
    });
  }
  function updateProgress() {
    const missing = window.validateForm();
    fillCheck.textContent = missing.length ? `尚有 ${missing.length} 項必填` : '填寫完成・預覽';
    fillCheck.title = missing.length ? `點擊查看待補欄位或設定：\n${missing.join('\n')}` : '點擊檢查列印預覽';
    fillCheck.setAttribute('aria-label', missing.length ? `尚有 ${missing.length} 項必填或設定待補，點擊查看` : '填寫完成，開啟預覽');
    fillCheck.classList.toggle('is-ready', !missing.length);
    const groups = cards.map(() => []);
    missing.forEach(message => {
      let section;
      if (window.FormConfig) section = window.FormConfig.sectionOf(message);
      else if (payment) section = /請款日期|申請人|部門|科目|請款事由/.test(message) ? 0 : /金額/.test(message) ? 1 : /憑證|開立|單據/.test(message) ? 3 : 2;
      else section = /申請日期|申請人|部門/.test(message) ? 0 : /代理人|聯絡電話/.test(message) ? 2 : /證明文件/.test(message) ? 3 : 1;
      groups[section].push(message);
    });
    const complete = groups.filter(group => !group.length).length;
    meter.value = complete; progressText.textContent = `${complete} / ${cards.length} 區段已完成`;
    meter.setAttribute('aria-valuetext', progressText.textContent);
    links.forEach((link, i) => {
      link.classList.toggle('is-complete', !groups[i].length);
      const state = link.querySelector('.section-state');
      if (!state.firstChild) {
        const check = icon('checkbox');
        check.replaceChildren();
        const path = document.createElementNS(check.namespaceURI, 'path');
        path.setAttribute('d', 'm5 12 4 4 10-10'); check.append(path); state.append(check);
      }
      state.hidden = !!groups[i].length;
      link.setAttribute('aria-label', `${i + 1}. ${cards[i].querySelector('h2').textContent}，${groups[i].length ? '尚有必填欄位' : '必填完成'}`);
    });
  }
  let pending = false;
  function scheduleProgress() {
    if (pending) return;
    pending = true; requestAnimationFrame(() => { pending = false; updateProgress(); });
  }
  root.addEventListener('input', scheduleProgress); root.addEventListener('change', scheduleProgress);
  root.addEventListener('click', scheduleProgress);
  // Programmatic restores, cleared forms, and conditional fields also update the meter.
  new MutationObserver(scheduleProgress).observe(main, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });
  window.addEventListener('pageshow', scheduleProgress);
  let scrollPending = false;
  window.addEventListener('scroll', () => {
    if (!breakpoint.matches || scrollPending) return;
    scrollPending = true; requestAnimationFrame(() => {
      scrollPending = false;
      let index = 0;
      cards.forEach((card, i) => { if (card.getBoundingClientRect().top <= 150) index = i; });
      activate(index);
    });
  }, { passive: true });
  breakpoint.addEventListener('change', layout);
  layout(); activate(0); updateProgress();
});
