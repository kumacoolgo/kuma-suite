export async function apiJson<T>(input: RequestInfo | URL, init: RequestInit = {}): Promise<T> {
  const res = await fetch(input, {
    credentials: 'include',
    ...init,
    headers: {
      ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      msg = data.error || data.message || msg;
    } catch {
      msg = (await res.text()) || msg;
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export async function downloadResponse(url: string, filename: string) {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error(await res.text());
  const blob = await res.blob();
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

export async function uploadFile(url: string, file: File, extra?: Record<string, string>) {
  const form = new FormData();
  form.append('file', file);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) form.append(k, v);
  }
  const res = await fetch(url, { method: 'POST', credentials: 'include', body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
