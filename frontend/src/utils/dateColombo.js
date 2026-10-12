const TZ = 'Asia/Colombo';

export function colomboParts(date = new Date()) {
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const parts = fmt.formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: get('year'),
    month: get('month'),
    day: get('day'),
    hour: get('hour'),
    minute: get('minute'),
    second: get('second'),
  };
}

export function colomboDateKey(date = new Date()) {
  const p = colomboParts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function colomboMonthKey(date = new Date()) {
  const p = colomboParts(date);
  return `${p.year}-${p.month}`;
}

export function startOfColomboDayKey(date = new Date()) {
  return colomboDateKey(date);
}

export function addDaysToDateKey(key, days) {
  const [y, m, d] = key.split('-').map(Number);
  const utc = Date.UTC(y, m - 1, d + days);
  return colomboDateKey(new Date(utc));
}

export function formatDisplayDate(dateKeyOrIso) {
  const key =
    typeof dateKeyOrIso === 'string' && dateKeyOrIso.length === 10
      ? dateKeyOrIso
      : colomboDateKey(new Date(dateKeyOrIso));
  const [y, m, d] = key.split('-');
  const dt = new Date(Number(y), Number(m) - 1, Number(d));
  return dt.toLocaleDateString('en-LK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function rangeForPeriod(period) {
  const today = colomboDateKey();
  const [y, m] = today.split('-').map(Number);
  if (period === 'week') {
    const end = today;
    const start = addDaysToDateKey(today, -6);
    return { start, end };
  }
  if (period === 'month') {
    const start = `${y}-${String(m).padStart(2, '0')}-01`;
    const end = today;
    return { start, end };
  }
  const start = `${y}-01-01`;
  const end = today;
  return { start, end };
}
