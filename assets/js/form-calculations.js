/* Date, duration and amount rules shared by the forms. No DOM access, so they stay testable. */
function numToChinese(amount) {
  if (!amount || isNaN(amount)) return '';
  amount = parseFloat(amount);
  if (amount <= 0) return '';

  const D = ['零', '壹', '貳', '參', '肆', '伍', '陸', '柒', '捌', '玖'];
  const SU = ['', '萬', '億', '兆'];

  const tc = Math.round(amount * 100);
  const yuan = Math.floor(tc / 100);
  const jiao = Math.floor((tc % 100) / 10);
  const fen = tc % 10;

  function g4(n) {
    if (!n) return '';
    const th = Math.floor(n / 1000);
    const hu = Math.floor((n % 1000) / 100);
    const te = Math.floor((n % 100) / 10);
    const on = n % 10;
    let s = '';

    if (th) s += D[th] + '仟';
    if (hu) {
      s += D[hu] + '佰';
    } else if (th && (te || on)) {
      s += '零';
    }
    if (te) {
      s += D[te] + '拾';
    } else if ((th || hu) && on) {
      s += '零';
    }
    if (on) s += D[on];
    return s;
  }

  function convYuan(n) {
    if (!n) return '零';
    const parts = [];
    let t = n;

    while (t > 0) {
      parts.unshift(t % 10000);
      t = Math.floor(t / 10000);
    }

    let r = '';
    parts.forEach((p, i) => {
      const su = SU[parts.length - 1 - i];
      if (!p) {
        if (r && !r.endsWith('零')) r += '零';
      } else {
        const s = g4(p);
        if (r && p < 1000 && !r.endsWith('零')) r += '零';
        r += s + su;
      }
    });

    return r.replace(/零+$/, '') || '零';
  }

  let res = '';
  if (yuan > 0) res += convYuan(yuan) + '元';

  if (jiao > 0 && fen > 0) {
    res += D[jiao] + '角' + D[fen] + '分';
  } else if (jiao > 0) {
    res += D[jiao] + '角整';
  } else if (fen > 0) {
    if (yuan > 0) res += '零';
    res += D[fen] + '分';
  } else {
    res += '整';
  }

  return res;
}

const FormCalc = (() => {
  const DAY_MS = 86400000;
  const pad = value => String(value).padStart(2, '0');

  function localDate(date = new Date()) {
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  }
  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
    return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
  }
  function weekday(value) {
    const date = parseDate(value);
    return date ? `星期${'日一二三四五六'[date.getDay()]}` : '';
  }
  const slashDate = value => (value || '').replaceAll('-', '/');
  const money = value => `NT$ ${Number(value).toLocaleString('zh-TW', { maximumFractionDigits: 2 })}`;
  const hoursText = minutes => `${minutes / 60} 小時`;

  /* Returns minutes: null while incomplete; invalid when the period is not positive. */
  function periodMinutes({ startDate, startHour, startMinute, endDate, endHour, endMinute, restMinutes }) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end || [startHour, startMinute, endHour, endMinute].some(value => value === '')) return { minutes: null, invalid: false };
    start.setHours(Number(startHour), Number(startMinute));
    end.setHours(Number(endHour), Number(endMinute));
    const minutes = Math.round((end - start) / 60000) - (Number(restMinutes) || 0);
    return minutes > 0 ? { minutes, invalid: false } : { minutes: null, invalid: true };
  }

  /* Calendar days including both ends. */
  function tripDays(startDate, endDate) {
    const start = parseDate(startDate);
    const end = parseDate(endDate);
    if (!start || !end) return { days: null, nights: null, invalid: false };
    const days = Math.round((end - start) / DAY_MS) + 1;
    return days > 0 ? { days, nights: days - 1, invalid: false } : { days: null, nights: null, invalid: true };
  }

  /* Digits for the pre-printed 拾萬…元 boxes: blank before the first digit, null when they cannot fit. */
  function amountUnits(amount) {
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0 || value >= 1000000) return null;
    const words = '零壹貳參肆伍陸柒捌玖';
    return [...String(value).padStart(6, ' ')].map(digit => (digit === ' ' ? '' : words[digit]));
  }

  const lineAmount = (quantity, price) => Math.round((Number(quantity) || 0) * (Number(price) || 0));

  /* basis: incl = prices include 5% tax, excl = 5% added on top, free = tax exempt. */
  function taxTotals(subtotal, basis) {
    if (basis === 'free') return { net: subtotal, tax: 0, total: subtotal };
    if (basis === 'incl') {
      const net = Math.round(subtotal / 1.05);
      return { net, tax: subtotal - net, total: subtotal };
    }
    const tax = Math.round(subtotal * 0.05);
    return { net: subtotal, tax, total: subtotal + tax };
  }

  return { localDate, parseDate, weekday, slashDate, money, hoursText, periodMinutes, tripDays, amountUnits, lineAmount, taxTotals };
})();
