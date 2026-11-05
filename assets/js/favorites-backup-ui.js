document.addEventListener('DOMContentLoaded', () => {
  const exportButton = document.getElementById('favorites-export');
  const fileInput = document.getElementById('favorites-file');
  const mode = document.getElementById('favorites-import-mode');
  const importButton = document.getElementById('favorites-import');
  const status = document.getElementById('favorites-backup-status');
  const dropzone = document.getElementById('favorites-dropzone');
  const chooseButton = document.getElementById('favorites-choose-file');
  const summary = document.getElementById('favorites-file-summary');
  const fileName = document.getElementById('favorites-file-name');
  const fileDetail = document.getElementById('favorites-file-detail');
  const fileState = document.getElementById('favorites-file-state');
  let pending = null;
  let readVersion = 0;

  exportButton.addEventListener('click', () => {
    try {
      const backup = FavoritesBackup.createExport();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      const date = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Taipei', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
      link.download = `常用資料備份-${date}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      status.textContent = `已匯出：${FavoritesBackup.describe(backup.datasets)}。`;
    } catch {
      status.textContent = '無法匯出，請確認瀏覽器允許本機儲存，且現有常用資料格式正確。';
    }
  });

  function resetFile() {
    ++readVersion;
    pending = null;
    importButton.disabled = true;
    fileInput.value = '';
    summary.hidden = true;
    fileName.textContent = fileDetail.textContent = fileState.textContent = '';
    chooseButton.textContent = '選擇 JSON 檔案';
    dropzone.classList.remove('is-dragging');
    dropzone.removeAttribute('aria-busy');
  }

  function showFileState(state, text) {
    fileState.dataset.state = state;
    fileState.textContent = text;
  }

  async function selectFile(file) {
    const version = ++readVersion;
    pending = null;
    importButton.disabled = true;
    if (!file) return;
    summary.hidden = false;
    fileName.textContent = file.name;
    fileDetail.textContent = file.size < 1024 ? `${file.size} B` : file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(1)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
    chooseButton.textContent = '更換檔案';
    showFileState('checking', '檢查中…');
    dropzone.setAttribute('aria-busy', 'true');
    status.textContent = '正在檢查備份檔格式與內容…';
    try {
      if (!/\.json$/i.test(file.name)) throw new Error('請選擇 .json 格式的備份檔。');
      if (file.size > 5 * 1024 * 1024) throw new Error('備份檔不可超過 5 MB。');
      const data = FavoritesBackup.parse(await file.text());
      if (version !== readVersion) return;
      pending = data;
      showFileState('valid', '檢查通過');
      status.textContent = `已檢查檔案：${FavoritesBackup.describe(data)}。請選擇匯入方式後按「確認匯入」。`;
      importButton.disabled = false;
    } catch (error) {
      if (version !== readVersion) return;
      showFileState('error', '檔案無法使用');
      status.textContent = error instanceof SyntaxError ? '無法解析 JSON，請選擇完整且有效的備份檔。' : error.message;
    } finally {
      if (version === readVersion) dropzone.removeAttribute('aria-busy');
    }
  }

  chooseButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', () => { if (fileInput.files[0]) selectFile(fileInput.files[0]); });
  document.getElementById('favorites-remove-file').addEventListener('click', () => {
    resetFile();
    status.textContent = '已移除檔案，可重新選擇 JSON 備份檔。';
    chooseButton.focus();
  });
  let dragDepth = 0;
  dropzone.addEventListener('dragenter', event => {
    event.preventDefault();
    dragDepth++;
    dropzone.classList.add('is-dragging');
  });
  dropzone.addEventListener('dragover', event => { event.preventDefault(); event.dataTransfer.dropEffect = 'copy'; });
  dropzone.addEventListener('dragleave', event => {
    event.preventDefault();
    if (--dragDepth <= 0) { dragDepth = 0; dropzone.classList.remove('is-dragging'); }
  });
  dropzone.addEventListener('drop', event => {
    event.preventDefault();
    dragDepth = 0;
    dropzone.classList.remove('is-dragging');
    if (event.dataTransfer.files.length !== 1) {
      resetFile();
      status.textContent = '每次請拖曳 1 個 JSON 備份檔。';
      return;
    }
    fileInput.value = '';
    selectFile(event.dataTransfer.files[0]);
  });

  importButton.addEventListener('click', () => {
    if (!pending) return;
    const action = mode.value === 'replace' ? '取代檔案內各類別的現有名單（含空名單），檔案未包含的類別保留' :
      '合併名單，同名資料保留現有內容與目前預設人員';
    if (!confirm(`${FavoritesBackup.describe(pending)}\n\n將${action}。確定匯入？`)) return;
    try {
      FavoritesBackup.importData(pending, mode.value);
      resetFile();
      status.textContent = '常用資料已匯入。各表單可使用匯入的資料；已開啟的表單請重新整理。';
    } catch (error) {
      status.textContent = error.message;
    }
  });
});
