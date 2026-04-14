'use client';

import { useEffect, useMemo, useState } from 'react';
import type { TimelineItem } from '@/lib/types';
import { apiJson, uploadFile } from '@/lib/client';
import { downloadFile } from '@/components/common';
import { fmtMoney, fmtDate } from '@/components/common';
import { nanoid } from 'nanoid';

type Draft = Partial<TimelineItem>;

const emptyDraft: Draft = {
  type: 'plan',
  name: '',
  number: '',
  start_date: new Date().toISOString().slice(0, 10),
  currency: 'CNY',
  category: '',
  tags: [],
  billing_day: 1,
  cycle: 'monthly',
  fiscal_month: 1,
  price_phases: [{ fromMonth: 1, amount: 0 }],
  cancel_windows: [],
  warranty_months: 24,
  policy_term_years: 0,
  policy_term_months: 0,
  balance: null,
  balance_from: null,
};

function parseTags(text: string) {
  return text.split(',').map((s) => s.trim()).filter(Boolean);
}

function makeMonthSeq(startDate: string, count = 12) {
  const start = new Date(startDate || new Date().toISOString());
  const arr: { label: string; idx: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(start.getFullYear(), start.getMonth() + i, 1);
    arr.push({ label: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, idx: i + 1 });
  }
  return arr;
}

function activePhase(phases: Array<{ fromMonth: number; amount: number }>, idx: number) {
  let current: number | null = null;
  for (const phase of [...phases].sort((a, b) => a.fromMonth - b.fromMonth)) {
    if (idx >= phase.fromMonth) current = phase.amount;
  }
  return current;
}

function Input({ label, value, onChange, type = 'text' }: { label: string; value: any; onChange: (v: string) => void; type?: string }) {
  return (
    <label className="stack" style={{ gap: 6 }}>
      <span className="muted tiny">{label}</span>
      <input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const data = await apiJson<{ items: TimelineItem[] }>('/api/timeline');
    setItems(data.items || []);
    if (data.items?.length && !selectedId) setSelectedId(data.items[0].id);
    if (!data.items?.length) setSelectedId(null);
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);
  useEffect(() => {
    const selected = items.find((i) => i.id === selectedId) || null;
    if (selected) setDraft(selected);
    else setDraft(emptyDraft);
  }, [selectedId, items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => [it.name, it.number, it.category, it.type, ...(it.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(s));
  }, [items, q]);

  async function save() {
    setMsg('');
    try {
      const payload = {
        ...draft,
        tags: Array.isArray(draft.tags) ? draft.tags : parseTags(String((draft as any).tags || '')),
        price_phases: Array.isArray(draft.price_phases) ? draft.price_phases : [{ fromMonth: 1, amount: 0 }],
        cancel_windows: Array.isArray(draft.cancel_windows) ? draft.cancel_windows : [],
        id: selectedId || draft.id || nanoid(),
      };
      const res = selectedId
        ? await apiJson<{ item: TimelineItem }>(`/api/timeline/${selectedId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await apiJson<{ item: TimelineItem }>('/api/timeline', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
      setSelectedId(res.item.id);
      await load();
      setMsg('已保存');
    } catch (e: any) {
      setMsg(e.message || '保存失败');
    }
  }

  async function remove(id: string) {
    if (!confirm('删除这条项目？')) return;
    await apiJson(`/api/timeline/${id}`, { method: 'DELETE' });
    if (selectedId === id) setSelectedId(null);
    await load();
  }

  async function exportJson() {
    const res = await fetch('/api/timeline/export', { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());
    downloadFile('timeline.json', await res.blob());
  }

  async function importJson(file: File) {
    await uploadFile('/api/timeline/import', file);
    await load();
  }

  const previewMonths = makeMonthSeq(draft.start_date || new Date().toISOString().slice(0, 10), 12);

  return (
    <div className="page stack">
      <section className="panel">
        <div className="panel-head">
          <h2>费用时间轴</h2>
          <div className="actions">
            <input className="" style={{ width: 220 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索名称 / 分类 / 标签" />
            <button className="btn" onClick={exportJson}>导出 JSON</button>
            <label className="btn"><span>导入 JSON</span><input type="file" accept="application/json,.json" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (file) await importJson(file); e.currentTarget.value = ''; }} /></label>
            <button className="btn primary" onClick={() => { setSelectedId(null); setDraft({ ...emptyDraft, id: nanoid() }); }}>新建</button>
          </div>
        </div>
        <div className="panel-body grid">
          <div className="stack">
            <div className="card-list">
              {filtered.map((item) => (
                <button key={item.id} className={`card ${selectedId === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)} style={{ textAlign: 'left' }}>
                  <div className="card-head">
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.name}</div>
                      <div className="muted tiny">{item.type} · {item.category || '未分类'} · {fmtDate(item.start_date)}</div>
                    </div>
                    <span className={`badge ${item.type === 'plan' ? '' : item.type === 'warranty' ? 'blue' : 'green'}`}>{item.currency}</span>
                  </div>
                  <div className="muted tiny">{(item.tags || []).map((t) => `#${t}`).join(' ') || '无标签'}</div>
                </button>
              ))}
              {!filtered.length && <div className="empty">没有匹配的项目。</div>}
            </div>
          </div>

          <div className="panel" style={{ background: 'rgba(10,15,28,.82)' }}>
            <div className="panel-head">
              <h3>{selectedId ? '编辑项目' : '新建项目'}</h3>
              <div className="actions">
                {selectedId && <button className="btn danger" onClick={() => remove(selectedId)}>删除</button>}
                <button className="btn primary" onClick={save}>{selectedId ? '保存' : '创建'}</button>
              </div>
            </div>
            <div className="panel-body stack">
              <div className="row cols-3">
                <Input label="类型 (plan/warranty/insurance)" value={draft.type} onChange={(v) => setDraft((d) => ({ ...d, type: v as any }))} />
                <Input label="名称" value={draft.name} onChange={(v) => setDraft((d) => ({ ...d, name: v }))} />
                <Input label="编号" value={draft.number} onChange={(v) => setDraft((d) => ({ ...d, number: v }))} />
              </div>
              <div className="row cols-3">
                <Input label="开始日期" type="date" value={draft.start_date} onChange={(v) => setDraft((d) => ({ ...d, start_date: v }))} />
                <Input label="货币" value={draft.currency} onChange={(v) => setDraft((d) => ({ ...d, currency: v.toUpperCase() }))} />
                <Input label="分类" value={draft.category} onChange={(v) => setDraft((d) => ({ ...d, category: v }))} />
              </div>
              <div className="row cols-2">
                <Input label="标签（逗号分隔）" value={(draft.tags || []).join(', ')} onChange={(v) => setDraft((d) => ({ ...d, tags: parseTags(v) }))} />
                <Input label="金额基准 / 余额" value={draft.balance ?? ''} onChange={(v) => setDraft((d) => ({ ...d, balance: v === '' ? null : Number(v) }))} type="number" />
              </div>
              <div className="row cols-3">
                <Input label="billing day" value={draft.billing_day ?? ''} onChange={(v) => setDraft((d) => ({ ...d, billing_day: v === '' ? null : Number(v) }))} type="number" />
                <Input label="cycle" value={draft.cycle} onChange={(v) => setDraft((d) => ({ ...d, cycle: v === 'yearly' ? 'yearly' : 'monthly' }))} />
                <Input label="fiscal month" value={draft.fiscal_month ?? ''} onChange={(v) => setDraft((d) => ({ ...d, fiscal_month: v === '' ? null : Number(v) }))} type="number" />
              </div>
              <div className="row cols-3">
                <Input label="warranty months" value={draft.warranty_months ?? ''} onChange={(v) => setDraft((d) => ({ ...d, warranty_months: v === '' ? null : Number(v) }))} type="number" />
                <Input label="policy term years" value={draft.policy_term_years ?? ''} onChange={(v) => setDraft((d) => ({ ...d, policy_term_years: v === '' ? null : Number(v) }))} type="number" />
                <Input label="policy term months" value={draft.policy_term_months ?? ''} onChange={(v) => setDraft((d) => ({ ...d, policy_term_months: v === '' ? null : Number(v) }))} type="number" />
              </div>
              <div className="row cols-2">
                <label className="stack" style={{ gap: 6 }}>
                  <span className="muted tiny">price phases JSON</span>
                  <textarea value={JSON.stringify(draft.price_phases || [], null, 2)} onChange={(e) => { try { setDraft((d) => ({ ...d, price_phases: JSON.parse(e.target.value) })); } catch {} }} />
                </label>
                <label className="stack" style={{ gap: 6 }}>
                  <span className="muted tiny">cancel windows JSON</span>
                  <textarea value={JSON.stringify(draft.cancel_windows || [], null, 2)} onChange={(e) => { try { setDraft((d) => ({ ...d, cancel_windows: JSON.parse(e.target.value) })); } catch {} }} />
                </label>
              </div>

              <div className="card">
                <div className="card-head">
                  <div>
                    <div style={{ fontWeight: 700 }}>月度预览</div>
                    <div className="muted tiny">从开始日期开始的 12 个月</div>
                  </div>
                  <span className="badge">{fmtMoney(draft.balance ?? 0, draft.currency || 'CNY')}</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, minmax(84px, 1fr))', gap: 8, overflowX: 'auto' }}>
                  {previewMonths.map((m) => {
                    const amt = activePhase((draft.price_phases || []) as any, m.idx);
                    return (
                      <div key={m.label} className="card" style={{ minWidth: 84, padding: '0.65rem', gap: 4 }}>
                        <div className="tiny muted">{m.label}</div>
                        <div style={{ fontWeight: 700 }}>{amt == null ? '—' : fmtMoney(amt, draft.currency || 'CNY')}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {msg && <div className="card"><div className="badge red">提示</div><div>{msg}</div></div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
