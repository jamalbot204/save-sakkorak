export function localTimestamp(): string {
  const d = new Date();
  const offset = -d.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const absOff = Math.abs(offset);
  const tz = `${sign}${String(Math.floor(absOff / 60)).padStart(2, '0')}:${String(absOff % 60).padStart(2, '0')}`;
  const pad = (n: number) => String(n).padStart(2, '0');
  const p = (n: number) => String(n).padStart(3, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${p(d.getMilliseconds())}${tz}`;
}

export function localToday(): string {
  return localTimestamp().split('T')[0];
}
