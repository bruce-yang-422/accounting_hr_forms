/* Install UI and update notifications. User-entered data stays in localStorage. */
(() => {
  const base = new URL('../../', document.currentScript.src);
  const installButton = document.getElementById('pwa-install');
  const state = document.getElementById('pwa-state');
  const standalone = window.matchMedia('(display-mode: standalone)');
  let installPrompt = null;
  let registration;
  let lastUpdateCheck = 0;

  const notices = document.createElement('div'); notices.className = 'pwa-notices';
  const offline = document.createElement('p'); offline.className = 'pwa-offline-status'; offline.setAttribute('role', 'status');
  offline.textContent = '離線模式 · 填寫資料仍保存在此瀏覽器';
  const update = document.createElement('div'); update.className = 'pwa-update'; update.hidden = true;
  const updateText = document.createElement('p'); updateText.setAttribute('role', 'status');
  updateText.textContent = '新版已準備好。請先儲存工作，再關閉本網站所有分頁；重新開啟即可更新。';
  const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.textContent = '知道了';
  dismiss.addEventListener('click', () => { update.hidden = true; });
  update.append(updateText, dismiss); notices.append(offline, update); document.body.append(notices);
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
  function showUpdate() { update.hidden = false; }
  function checkForUpdates() {
    if (registration && navigator.onLine && Date.now() - lastUpdateCheck > 60000) {
      lastUpdateCheck = Date.now(); registration.update().catch(() => {});
    }
  }
  document.addEventListener('visibilitychange', () => { if (!document.hidden) checkForUpdates(); });
  if (!['https:', 'http:'].includes(location.protocol) || !window.isSecureContext || !('serviceWorker' in navigator)) {
    if (state) state.textContent = '請使用支援的瀏覽器開啟 HTTPS 網站，以啟用安裝與離線功能。';
    return;
  }
  if (state) state.textContent = '正在準備離線功能，完成後會在這裡顯示。';
  navigator.serviceWorker.addEventListener('controllerchange', ready);
  navigator.serviceWorker.register(new URL('service-worker.js', base), { scope: base.pathname, updateViaCache: 'none' })
    .then(async result => {
      registration = result;
      if (result.waiting) showUpdate();
      result.addEventListener('updatefound', () => {
        const worker = result.installing;
        worker?.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
          if (worker.state === 'redundant' && !result.active && state) state.textContent = '離線準備尚未完成，請連網後重新開啟；目前仍可填寫表單。';
        });
      });
      await navigator.serviceWorker.ready; ready();
    }).catch(() => {
      if (state) state.textContent = '暫時無法準備離線功能；連網時仍可正常使用。';
    });
})();
