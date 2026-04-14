export function fmtDate(value?: string | null) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toISOString().slice(0, 10);
}

export function fmtMoney(value?: number | string | null, currency = 'CNY') {
  const n = Number(value || 0);
  const symbol: Record<string, string> = { CNY: '￥', JPY: 'JP￥', USD: '$', EUR: '€' };
  return `${symbol[currency] ?? currency + ' '} ${Math.round(n).toLocaleString('zh-CN')}`;
}

export function downloadFile(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export async function copyText(text: string) {
  await navigator.clipboard.writeText(text);
}
