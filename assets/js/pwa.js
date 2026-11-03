/* Install UI and update notifications. User-entered data stays in localStorage. */
(() => {
  const base = new URL('../../', document.currentScript.src);
  const installButton = document.getElementById('pwa-install');
  const state = document.getElementById('pwa-state');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt = null;
  let registration;
  let lastUpdateCheck = 0;
  const storagePrefix = `office-forms:pwa:${base.pathname}:`;
  const pendingKey = storagePrefix + 'pending-form';
  const dismissedKey = storagePrefix + 'dismissed-version';
  let pendingVersion = '';
  let dismissedVersion = '';
  let noticeGeneration = 0;
  let updateRequested = false;
  let restoreFailed = false;
  let activationTimer;

  const notices = document.createElement('div'); notices.className = 'pwa-notices';
  const offline = document.createElement('p'); offline.className = 'pwa-offline-status'; offline.setAttribute('role', 'status');
  offline.textContent = '離線模式 · 填寫資料仍保存在此瀏覽器';
  const update = document.createElement('div'); update.className = 'pwa-update'; update.hidden = true;
  const updateText = document.createElement('p'); updateText.setAttribute('role', 'status');
  updateText.textContent = '新版已準備好，可立即更新；目前表單內容會先暫存，更新後自動還原。';
  const applyUpdate = document.createElement('button'); applyUpdate.type = 'button'; applyUpdate.textContent = '立即更新';
  applyUpdate.className = 'pwa-update-primary';
  const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '稍後';
  dismiss.addEventListener('click', () => {
    dismissedVersion = pendingVersion;
    if (pendingVersion) { try { localStorage.setItem(dismissedKey, pendingVersion); } catch {} }
    update.hidden = true;
  });
  update.append(updateText, applyUpdate, dismiss); notices.append(offline, update); document.body.append(notices);

  function preserveForm() {
    const fillPage = document.getElementById('fillPage');
    if (!fillPage || typeof FormRecentRecords === 'undefined') return;
    const payment = Boolean(document.getElementById('payee'));
    const draftKey = payment ? '__currentPaymentDraftId' : '__currentLeaveDraftId';
    const recentKey = payment ? '__currentRecentPaymentRecordId' : '__currentRecentLeaveRecordId';
    const snapshot = { path: location.pathname, savedAt: Date.now(), data: FormRecentRecords.collect(fillPage),
      draftId: window[draftKey] || '', recentId: window[recentKey] || '', baseline: window.DraftLibrary?.getSessionSnapshot() || '',
      libraryState: window.DraftLibrary?.getLibraryState(),
      preview: document.getElementById('previewPage')?.style.display === 'block', scrollY: window.scrollY };
    sessionStorage.setItem(pendingKey, JSON.stringify(snapshot));
  }
  function restoreForm() {
    let raw;
    try { raw = sessionStorage.getItem(pendingKey); } catch { return; }
    if (!raw) return;
    try {
      const snapshot = JSON.parse(raw);
      if (snapshot.path !== location.pathname) return;
      if (Date.now() - snapshot.savedAt > 30 * 60 * 1000) { sessionStorage.removeItem(pendingKey); return; }
      const payment = Boolean(document.getElementById('payee'));
      const restore = payment ? window.restorePaymentFormData : window.restoreLeaveFormData;
      if (!document.getElementById('fillPage') || typeof restore !== 'function') return;
      restore(snapshot.data);
      window[payment ? '__currentPaymentDraftId' : '__currentLeaveDraftId'] = snapshot.draftId || '';
      window[payment ? '__currentRecentPaymentRecordId' : '__currentRecentLeaveRecordId'] = snapshot.recentId || '';
      window.DraftLibrary?.restoreSessionSnapshot(snapshot.baseline);
      window.DraftLibrary?.restoreLibraryState(snapshot.libraryState);
      if (snapshot.preview) {
        window.buildPreview();
        document.getElementById('fillPage').style.display = 'none';
        document.getElementById('previewPage').style.display = 'block';
      }
      sessionStorage.removeItem(pendingKey);
      requestAnimationFrame(() => window.scrollTo(0, snapshot.scrollY || 0));
    } catch {
      restoreFailed = true;
      updateText.textContent = '更新後未能自動還原表單，暫存仍保留在此分頁。請重新整理後再試。';
      applyUpdate.hidden = dismiss.hidden = true; update.hidden = false;
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', restoreForm);
  else restoreForm();
  function networkStatus() { offline.hidden = navigator.onLine; }
  networkStatus();
  window.addEventListener('offline', networkStatus);
  window.addEventListener('online', () => { networkStatus(); checkForUpdates(); });
  function installed() {
    if (installButton) installButton.hidden = standalone.matches || Boolean(navigator.standalone);
  }
  installed(); standalone.addEventListener('change', installed);
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault(); installPrompt = event;
    if (installButton) installButton.textContent = '安裝到裝置';
  });
  window.addEventListener('appinstalled', () => {
    installPrompt = null;
    if (installButton) installButton.hidden = true;
    if (state) state.textContent = '已完成安裝，可從主畫面或應用程式清單開啟。';
  });

  function showInstallHelp() {
    let dialog = document.getElementById('pwa-install-help');
    if (!dialog) {
      dialog = document.createElement('dialog'); dialog.id = 'pwa-install-help'; dialog.className = 'pwa-install-dialog';
      dialog.setAttribute('aria-labelledby', 'pwa-help-title');
      dialog.innerHTML = '<h2 id="pwa-help-title">加入主畫面</h2><p>安裝後可直接開啟表單填寫中心，已準備好的頁面也能離線使用。</p>' +
        '<h3>iPhone／iPad</h3><p>在 Safari 開啟此網站，點「分享」→「加入主畫面」→「加入」。</p>' +
        '<h3>Android／電腦</h3><p>在支援安裝的瀏覽器選單中，選擇「安裝應用程式」或「新增至主畫面」。若沒有此選項，可先用 Chrome 或 Edge 開啟此網站。</p>' +
        '<p class="pwa-help-note">請先連網開啟一次，等首頁顯示「已可離線使用」再離線操作。安裝不會同步不同裝置的資料，可使用 JSON 備份移轉常用名單。</p>';
      const close = document.createElement('button'); close.type = 'button'; close.textContent = '知道了';
      close.addEventListener('click', () => dialog.close()); dialog.append(close); document.body.append(dialog);
    }
    dialog.showModal();
  }
  installButton?.addEventListener('click', async () => {
    if (!installPrompt) { showInstallHelp(); return; }
    const prompt = installPrompt; installPrompt = null;
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') installButton.hidden = true;
      else installButton.textContent = '加入主畫面';
    } catch { showInstallHelp(); }
  });

  function ready() { if (state) state.textContent = '已可離線使用 · 資料保存在目前裝置與瀏覽器。'; }
  function workerVersion(worker) {
    return new Promise(resolve => {
      const channel = new MessageChannel();
      const finish = value => { clearTimeout(timeout); channel.port1.close(); resolve(value); };
      const timeout = setTimeout(() => finish(''), 1500);
      channel.port1.onmessage = event => finish(typeof event.data?.version === 'string' ? event.data.version : '');
      try { worker.postMessage({ type: 'GET_VERSION' }, [channel.port2]); } catch { finish(''); }
    });
  }
  async function showUpdate(worker = registration?.waiting) {
    if (!worker || updateRequested || restoreFailed) return;
    const generation = ++noticeGeneration;
    const version = await workerVersion(worker);
    if (generation !== noticeGeneration || worker.state !== 'installed' || registration?.waiting !== worker) return;
    pendingVersion = version;
    if (version && version === dismissedVersion) return;
    try { if (version && localStorage.getItem(dismissedKey) === version) return; } catch {}
    applyUpdate.hidden = dismiss.hidden = false;
    updateText.textContent = '新版已準備好，可立即更新；目前表單內容會先暫存，更新後自動還原。';
    update.hidden = false;
  }
  function hideUpdate() { ++noticeGeneration; pendingVersion = ''; if (!restoreFailed) update.hidden = true; }
  function failUpdate(text) {
    updateRequested = false;
    clearTimeout(activationTimer);
    try { sessionStorage.removeItem(pendingKey); } catch {}
    applyUpdate.disabled = dismiss.disabled = false;
    applyUpdate.textContent = '重試更新';
    updateText.textContent = text; update.hidden = false;
  }
  applyUpdate.addEventListener('click', () => {
    const worker = registration?.waiting;
    if (!worker || worker.state !== 'installed') { hideUpdate(); checkForUpdates(); return; }
    try {
      preserveForm();
      updateRequested = true;
      applyUpdate.disabled = dismiss.disabled = true;
      applyUpdate.textContent = '更新中…';
      activationTimer = setTimeout(() => failUpdate('更新尚未完成，目前表單內容仍保留。可重試更新或稍後再處理。'), 12000);
      worker.postMessage({ type: 'ACTIVATE_UPDATE' });
    } catch { failUpdate('無法暫存目前內容，尚未進行更新。請先儲存草稿，再重試更新。'); }
  });
  window.addEventListener('storage', event => {
    if (event.key === dismissedKey && event.newValue === pendingVersion) { dismissedVersion = pendingVersion; update.hidden = true; }
  });
  function checkForUpdates() {
    if (registration && navigator.onLine && Date.now() - lastUpdateCheck > 60000) {
      lastUpdateCheck = Date.now(); registration.update().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) { if (registration?.waiting) showUpdate(); else if (!updateRequested) hideUpdate(); checkForUpdates(); }
  });
  window.addEventListener('pageshow', () => { if (registration?.waiting) showUpdate(); else if (!updateRequested) hideUpdate(); });
  if (!['https:', 'http:'].includes(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator)) {
    if (state) state.textContent = '請使用支援的瀏覽器開啟 HTTPS 網站，以啟用安裝與離線功能。';
    return;
  }
  if (state) state.textContent = '正在準備離線功能，完成後會在這裡顯示。';
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    hideUpdate(); ready();
    if (updateRequested) { clearTimeout(activationTimer); location.reload(); }
  });
  navigator.serviceWorker.register(new URL('service-worker.js', base), { scope: base.pathname, updateViaCache: 'none' })
    .then(async result => {
      registration = result;
      if (result.waiting) showUpdate();
      result.addEventListener('updatefound', () => {
        const worker = result.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate(worker);
          if (worker.state === 'redundant' && !result.active && state) state.textContent = '離線準備尚未完成，請連網後重新開啟；目前仍可填寫表單。';
        });
      });
      await navigator.serviceWorker.ready; ready();
    }).catch(() => {
      if (state) state.textContent = '暫時無法準備離線功能；連網時仍可正常使用。';
    });
})();
