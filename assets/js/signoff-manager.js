/* Per-form print settings: sign-off boxes and the review section. Blank entries are not printed. */
document.addEventListener('DOMContentLoaded', () => {
  const list = document.getElementById('signoff-list');
  if (!list) return;
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text) element.textContent = text;
    return element;
  };
  const textInput = (maxLength, placeholder, label) => {
    const input = make('input', 'fi');
    input.type = 'text';
    if (maxLength) input.maxLength = maxLength;
    input.placeholder = placeholder;
    input.setAttribute('aria-label', label);
    return input;
  };

  function card(form) {
    const article = make('article', 'signoff-card');
    article.dataset.signoffForm = form.id;
    const heading = make('div', 'signoff-card-head');
    const badge = make('span', 'signoff-badge');
    heading.append(make('h3', '', form.label), badge);

    const boxes = make('div', 'signoff-boxes');
    const signoffInputs = Array.from({ length: SignoffStore.MAX_BOXES }, (_, index) => {
      const input = textInput(SignoffStore.MAX_NAME, '不列印', `${form.label}第 ${index + 1} 格簽核欄名稱`);
      boxes.append(input);
      return input;
    });

    const reviews = make('div', 'review-rows');
    const reviewInputs = Array.from({ length: ReviewStore.MAX_ITEMS }, (_, index) => {
      const row = make('div', 'review-row');
      const name = textInput(ReviewStore.MAX_NAME, '不列印', `${form.label}審核區第 ${index + 1} 項名稱`);
      const options = textInput(0, '留空為填寫線', `${form.label}審核區第 ${index + 1} 項勾選項目`);
      row.append(name, options);
      reviews.append(row);
      return { name, options };
    });

    const status = make('p', 'fm-status');
    status.setAttribute('role', 'status');
    const save = make('button', 'btn pm-save-btn', '儲存');
    const reset = make('button', 'btn pm-cancel-btn', '恢復預設');
    save.type = reset.type = 'button';
    const actions = make('div', 'pm-form-actions');
    actions.append(save, reset);

    function show() {
      const names = SignoffStore.get(form.id);
      signoffInputs.forEach((input, index) => { input.value = names[index] || ''; });
      const items = ReviewStore.get(form.id);
      reviewInputs.forEach((inputs, index) => {
        inputs.name.value = items[index]?.name || '';
        inputs.options.value = (items[index]?.options || []).join('、');
      });
      const custom = SignoffStore.isCustom(form.id) || ReviewStore.isCustom(form.id);
      badge.textContent = custom ? '已自訂' : '預設';
      badge.classList.toggle('is-custom', custom);
    }
    function attempt(action, done) {
      try {
        action();
        show();
        status.textContent = done;
      } catch (error) {
        status.textContent = `未儲存：${error.message}`;
      }
    }
    save.addEventListener('click', () => attempt(() => {
      const names = signoffInputs.map(input => input.value);
      const items = reviewInputs.map(inputs => ({ name: inputs.name.value, options: inputs.options.value }));
      // Check both first, so one bad entry cannot leave the settings half saved.
      SignoffStore.check(form.id, names);
      ReviewStore.check(form.id, items);
      SignoffStore.save(form.id, names);
      ReviewStore.save(form.id, items);
    }, '已儲存，之後列印會使用這些設定。'));
    reset.addEventListener('click', () => attempt(() => {
      SignoffStore.reset(form.id);
      ReviewStore.reset(form.id);
    }, '已恢復預設。'));

    article.append(heading, make('p', 'signoff-section', '簽核欄（左側職級最高，右側製單人／申請人；常見職稱自動排序）'), boxes,
      make('p', 'signoff-section', '審核區（左：名稱；右：勾選項目，以「、」分隔）'), reviews, actions, status);
    show();
    return { article, show };
  }

  const cards = SignoffStore.FORMS.map(card);
  list.replaceChildren(...cards.map(item => item.article));
  const refresh = () => cards.forEach(item => item.show());
  window.addEventListener('favorites-imported', refresh);
  window.addEventListener('storage', event => {
    if (event.key === null || event.key === SignoffStore.KEY || event.key === ReviewStore.KEY) refresh();
  });
});
