/* Shared behaviour for declaratively configured forms (overtime, travel, purchase).
   Each form passes its validation sections, refresh, preview and sample data to setup(). */
const FormPage = (() => {
  const byId = id => document.getElementById(id);
  const value = id => byId(id)?.value.trim() ?? '';
  const radio = name => document.querySelector(`input[name="${name}"]:checked`)?.value || '';
  const checked = name => [...document.querySelectorAll(`input[name="${name}"]:checked`)];
  const choiceLabel = input => input.closest('label').textContent.trim();
  const radioLabel = name => { const input = checked(name)[0]; return input ? choiceLabel(input) : ''; };
  const text = (id, content) => { const element = byId(id); if (element) element.textContent = content || ''; };

  function setValues(values) {
    Object.entries(values).forEach(([id, content]) => { byId(id).value = content; });
  }
  function pick(name, ...values) {
    document.querySelectorAll(`input[name="${name}"]`).forEach(input => { input.checked = values.includes(input.value); });
  }

  function setup(options) {
    const fill = byId('fillPage');
    const preview = byId('previewPage');
    const controls = () => fill.querySelectorAll('input, select, textarea');
    let restoring = false;

    function resetField(field) {
      if (field.type === 'radio' || field.type === 'checkbox') field.checked = field.defaultChecked;
      else if (field.tagName === 'SELECT') field.value = [...field.options].find(option => option.defaultSelected)?.value ?? field.options[0].value;
      else field.value = field.defaultValue;
    }
    function syncChoices() {
      fill.querySelectorAll('input[type="radio"]').forEach(input => input.closest('.rpill')?.classList.toggle('active', input.checked));
      fill.querySelectorAll('input[type="checkbox"]').forEach(input => input.closest('.cbox-item')?.classList.toggle('checked', input.checked));
    }
    /* data-show-when="field=value" shows a block for that choice and clears it when hidden. */
    function syncConditional() {
      fill.querySelectorAll('[data-show-when]').forEach(block => {
        const [name, expected] = block.dataset.showWhen.split('=');
        const show = checked(name).some(input => input.value === expected);
        block.style.display = show ? '' : 'none';
        if (!show) block.querySelectorAll('input, select, textarea').forEach(resetField);
      });
    }
    function refresh() {
      if (restoring) return;
      syncChoices();
      syncConditional();
      options.refresh?.();
    }

    function resetFields() {
      controls().forEach(field => { if (!field.hasAttribute('data-keep-on-reset')) resetField(field); });
      byId('reqDate').value = FormCalc.localDate();
      options.onReset?.();
      refresh();
    }
    function clearForm() {
      if (!confirm('確定要清除所有填寫內容？')) return;
      window[config.recentKey] = '';
      window.DraftLibrary?.resetCurrent();
      resetFields();
    }
    function fillSample() {
      window[config.recentKey] = '';
      window.DraftLibrary?.resetCurrent();
      resetFields();
      options.sample();
      refresh();
    }

    function showPage(page) {
      fill.style.display = page === fill ? 'block' : 'none';
      preview.style.display = page === preview ? 'block' : 'none';
      window.scrollTo(0, 0);
    }
    function restore(data) {
      restoring = true;
      try { FormRecentRecords.restore(data, fill); } finally { restoring = false; }
      // Keep default choices when a saved record has none for a group.
      fill.querySelectorAll('input[type="radio"]').forEach(input => {
        if (input.defaultChecked && !radio(input.name)) input.checked = true;
      });
      options.onRestore?.();
      refresh();
      showPage(fill);
    }

    /* A rule is { id | radio | check, label, when } or { ok, label, when }. */
    function ruleMissing(rule) {
      if (rule.when && !rule.when()) return false;
      if (rule.ok) return !rule.ok();
      if (rule.radio) return !radio(rule.radio);
      if (rule.check) return !checked(rule.check).length;
      return !value(rule.id);
    }
    function validateForm() {
      return options.sections.flat().filter(ruleMissing).map(rule => rule.label);
    }
    function sectionOf(message) {
      return Math.max(0, options.sections.findIndex(rules => rules.some(rule => rule.label === message)));
    }
    function buildPreview() {
      text('pv-docno', value('docNo'));
      text('pv-date', FormCalc.slashDate(value('reqDate')));
      options.preview();
      if (typeof SignoffStore !== 'undefined') SignoffStore.refreshPreview?.();
    }
    function goToPreview() {
      const missing = validateForm();
      if (missing.length) {
        alert('以下欄位尚未填寫或設定有誤，請補充後再繼續：\n\n• ' + missing.join('\n• '));
        return;
      }
      buildPreview();
      showPage(preview);
      // The sheet is one fixed A5 page, so long text must be flagged instead of silently cut.
      const sheet = byId('pvSheet');
      byId('pvOverflow').hidden = sheet.scrollHeight <= sheet.clientHeight + 1;
    }
    function goBack() { showPage(fill); }
    function printRecord() {
      try {
        const record = FormRecentRecords.save(config.type, config.title(), FormRecentRecords.collect(fill), window[config.recentKey] || '');
        window[config.recentKey] = record.id;
        window.DraftLibrary?.refreshCounts();
      } catch (error) {
        alert(`未能保存到最近完成（${error.message}），仍會繼續列印。`);
      }
      window.print();
    }

    const config = {
      type: options.type, label: options.label, title: options.title, restore, sectionOf,
      summaryFields: options.summaryFields,
      idKey: '__currentDraftId', recentKey: '__currentRecentRecordId',
    };
    window.__currentDraftId = '';
    window.__currentRecentRecordId = '';
    window.FormConfig = config;
    Object.assign(window, { validateForm, goToPreview, goBack, clearForm, fillSample, buildPreview, printRecord });

    fill.addEventListener('input', refresh);
    fill.addEventListener('change', refresh);
    window.addEventListener('beforeprint', buildPreview);
    byId('reqDate').value = FormCalc.localDate();
    refresh();
  }

  return { setup, byId, value, radio, checked, choiceLabel, radioLabel, text, setValues, pick };
})();
