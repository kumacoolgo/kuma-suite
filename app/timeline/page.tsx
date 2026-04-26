'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { apiJson } from '@/lib/client';
import type { TimelineItem } from '@/lib/types';

type ItemType = TimelineItem['type'];
type Cycle = TimelineItem['cycle'];
type PricePhase = TimelineItem['price_phases'][number];
type CancelWindow = TimelineItem['cancel_windows'][number];

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '￥',
  JPY: 'JP￥',
  USD: '$',
  EUR: '€',
};

const emptyItem: Partial<TimelineItem> = {
  type: 'plan',
  name: '',
  number: '',
  start_date: '',
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

function pad2(n: number) {
  return n < 10 ? `0${n}` : String(n);
}

function parseISODate(s?: string | null) {
  if (!s) return new Date();
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

function addMonths(d: Date, n: number) {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function monthIndex(from: Date, current: Date) {
  return (current.getFullYear() - from.getFullYear()) * 12 + current.getMonth() - from.getMonth() + 1;
}

function fmtMoney(amount: number, currency = 'CNY') {
  const num = Math.round(Number(amount || 0)).toLocaleString('zh-CN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${CURRENCY_SYMBOLS[currency] ?? `${currency} `} ${num}`;
}

function resolvePlanPrice(phases: PricePhase[] | undefined, idx: number) {
  if (!phases?.length) return null;
  let amount: number | null = null;
  [...phases].sort((a, b) => a.fromMonth - b.fromMonth).forEach((phase) => {
    if (idx >= phase.fromMonth) amount = phase.amount;
  });
  return amount;
}

function isInCancel(windows: CancelWindow[] | undefined, idx: number) {
  return windows?.some((window) => idx >= window.fromMonth && idx <= window.toMonth) ?? false;
}

function updatePhasesForEdit(phases: PricePhase[], targetMonth: number, amount: number) {
  const sorted = [...phases].sort((a, b) => a.fromMonth - b.fromMonth);
  const current = resolvePlanPrice(sorted, targetMonth);
  if (current === amount) return sorted;

  const laterStarts = sorted.filter((phase) => phase.fromMonth > targetMonth).map((phase) => phase.fromMonth);
  const nextStart = laterStarts.length ? Math.min(...laterStarts) : Infinity;
  const before = sorted.filter((phase) => phase.fromMonth < targetMonth);
  const after = sorted.filter((phase) => phase.fromMonth >= nextStart);
  const lastBefore = before[before.length - 1];
  const middle = lastBefore?.amount === amount ? [] : [{ fromMonth: targetMonth, amount }];

  return [...before, ...middle, ...after]
    .sort((a, b) => a.fromMonth - b.fromMonth)
    .reduce<PricePhase[]>((acc, phase) => {
      const last = acc[acc.length - 1];
      if (!last || last.amount !== phase.amount) acc.push(phase);
      return acc;
    }, []);
}

function defaultStartDate() {
  const today = new Date();
  return `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`;
}

function normalizeDraft(item: Partial<TimelineItem>): Partial<TimelineItem> {
  return {
    ...emptyItem,
    ...item,
    type: item.type || 'plan',
    start_date: item.start_date ? item.start_date.slice(0, 10) : defaultStartDate(),
    tags: Array.isArray(item.tags) ? item.tags : [],
    price_phases: item.price_phases?.length ? item.price_phases : [{ fromMonth: 1, amount: 0 }],
    cancel_windows: item.cancel_windows ?? [],
    warranty_months: item.warranty_months ?? 24,
    cycle: item.cycle || 'monthly',
    fiscal_month: item.fiscal_month ?? 1,
    currency: item.currency || 'CNY',
  };
}

function typeLabel(type: ItemType) {
  if (type === 'insurance') return '保险';
  if (type === 'warranty') return '保修';
  return '套餐';
}

function typeColor(type: ItemType) {
  if (type === 'insurance') return '#10b981';
  if (type === 'warranty') return '#3b82f6';
  return '#6b5cff';
}

const buttonBase: React.CSSProperties = {
  border: 0,
  borderRadius: 10,
  background: '#eceff3',
  color: '#111827',
  padding: '8px 12px',
  cursor: 'pointer',
};

const primaryButton: React.CSSProperties = {
  ...buttonBase,
  background: '#3b82f6',
  color: '#fff',
};

const inputStyle: React.CSSProperties = {
  border: '1px solid #eef0f3',
  borderRadius: 10,
  padding: '8px 10px',
  background: '#fff',
  color: '#0f172a',
};

export default function TimelinePage() {
  const [allItems, setAllItems] = useState<TimelineItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<TimelineItem>>(normalizeDraft(emptyItem));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const importRef = useRef<HTMLInputElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiJson<{ items: TimelineItem[] }>('/api/timeline');
      const next = data.items ?? [];
      setAllItems(next);
      setActiveId((current) => (current && next.some((item) => item.id === current) ? current : next[0]?.id ?? null));
    } catch (e: any) {
      setMsg(e.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const items = useMemo(() => {
    const term = filter.trim().toLowerCase();
    if (!term) return allItems;
    return allItems.filter((item) => [
      item.name,
      item.type,
      item.number,
      item.category,
      ...(item.tags || []),
    ].filter(Boolean).join(' ').toLowerCase().includes(term));
  }, [allItems, filter]);

  const activeItem = useMemo(() => {
    return allItems.find((item) => item.id === activeId) || items[0] || null;
  }, [activeId, allItems, items]);

  const visibleItems = activeItem ? [activeItem] : [];

  const months = useMemo(() => {
    const today = new Date();
    const todayYM = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
    return Array.from({ length: 49 }, (_, i) => {
      const d = addMonths(new Date(), i - 12);
      const ym = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      return { date: d, ym, label: `${d.getFullYear()}/${pad2(d.getMonth() + 1)}`, isToday: ym === todayYM };
    });
  }, []);

  useEffect(() => {
    const today = new Date();
    const ym = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
    const head = gridRef.current?.querySelector<HTMLElement>(`[data-ym="${ym}"]`);
    if (head && gridRef.current) gridRef.current.scrollTo({ left: Math.max(0, head.offsetLeft - 10), behavior: 'auto' });
  }, [activeId, months.length]);

  function openNewDialog() {
    setEditingId(null);
    setDraft(normalizeDraft({ ...emptyItem, start_date: defaultStartDate() }));
    setMsg('');
    setDialogOpen(true);
  }

  function openEditDialog() {
    if (!activeItem) return;
    setEditingId(activeItem.id);
    setDraft(normalizeDraft(activeItem));
    setMsg('');
    setDialogOpen(true);
  }

  function patchDraft(patch: Partial<TimelineItem>) {
    setDraft((current) => ({ ...current, ...patch }));
  }

  function setPhase(index: number, patch: Partial<PricePhase>) {
    const phases = [...(draft.price_phases || [])];
    const current = phases[index] || { fromMonth: 1, amount: 0 };
    phases[index] = { ...current, ...patch };
    patchDraft({ price_phases: phases });
  }

  function setCancelWindow(index: number, patch: Partial<CancelWindow>) {
    const windows = [...(draft.cancel_windows || [])];
    const current = windows[index] || { fromMonth: 1, toMonth: 1 };
    windows[index] = { ...current, ...patch };
    patchDraft({ cancel_windows: windows });
  }

  async function saveItem() {
    setMsg('');
    const next = normalizeDraft(draft);
    if (!next.name?.trim()) {
      setMsg('请填写项目名称');
      return;
    }
    if (!next.start_date) {
      setMsg('请选择开始日');
      return;
    }
    const payload = {
      ...next,
      id: editingId || undefined,
      name: next.name.trim(),
      number: next.number || null,
      category: next.category || null,
      billing_day: 1,
      fiscal_month: next.cycle === 'yearly' ? next.fiscal_month : null,
      warranty_months: next.type === 'warranty' ? next.warranty_months : null,
      cancel_windows: next.type === 'insurance' ? [] : next.cancel_windows,
    };

    setLoading(true);
    try {
      const res = editingId
        ? await apiJson<{ item: TimelineItem }>(`/api/timeline/${editingId}`, { method: 'PUT', body: JSON.stringify(payload) })
        : await apiJson<{ item: TimelineItem }>('/api/timeline', { method: 'POST', body: JSON.stringify(payload) });
      setDialogOpen(false);
      setEditingId(null);
      await load();
      setActiveId(res.item.id);
    } catch (e: any) {
      setMsg(e.message || '保存失败');
    } finally {
      setLoading(false);
    }
  }

  async function deleteItem() {
    if (!editingId) return;
    if (!confirm('确定要删除该项目吗？此操作无法撤销。')) return;
    setLoading(true);
    try {
      await apiJson(`/api/timeline/${editingId}`, { method: 'DELETE' });
      setDialogOpen(false);
      setEditingId(null);
      await load();
    } catch (e: any) {
      setMsg(e.message || '删除失败');
    } finally {
      setLoading(false);
    }
  }

  async function exportItems() {
    setLoading(true);
    try {
      const res = await fetch('/api/timeline/export', { credentials: 'include' });
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `expense-timeline-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      alert(`导出失败：${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  async function importItems(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/timeline/import', { method: 'POST', credentials: 'include', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      await load();
      alert('导入成功');
    } catch (err: any) {
      alert(`导入失败：${err.message || err}`);
    } finally {
      e.target.value = '';
      setLoading(false);
    }
  }

  async function editMonthAmount(item: TimelineItem, idx: number) {
    if (item.type === 'warranty' || idx < 1) return;
    const phases = item.price_phases || [];
    const current = resolvePlanPrice(phases, idx);
    const input = prompt(`设置从第 ${idx} 个月起（直到下一阶段前）的金额：`, current != null ? String(current) : '');
    if (input == null) return;
    const amount = Number(input);
    if (Number.isNaN(amount) || amount < 0) {
      alert('金额必须是非负数字');
      return;
    }
    const balanceInput = prompt(
      item.balance && item.balance_from && idx >= item.balance_from
        ? '可选：设置余额（从本月开始逐月显示剩余，留空不变，0 清除）'
        : '可选：设置余额（从本月开始逐月显示剩余）',
      item.balance && item.balance_from && idx >= item.balance_from ? String(item.balance) : '',
    );
    const balancePatch: Partial<TimelineItem> = {};
    if (balanceInput !== null && balanceInput.trim() !== '') {
      const balance = Math.max(0, Number(balanceInput));
      if (Number.isNaN(balance)) {
        alert('金额必须是非负数字');
        return;
      }
      balancePatch.balance = balance;
      balancePatch.balance_from = idx;
    }

    setLoading(true);
    try {
      await apiJson(`/api/timeline/${item.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...item,
          price_phases: updatePhasesForEdit(phases, idx, amount),
          ...balancePatch,
        }),
      });
      await load();
    } catch (e: any) {
      alert(`保存失败：${e.message || e}`);
    } finally {
      setLoading(false);
    }
  }

  function renderCell(item: TimelineItem, monthDate: Date, isToday: boolean) {
    const start = startOfMonth(parseISODate(item.start_date));
    const idx = monthIndex(start, monthDate);
    let content = '';
    let sub = '';
    let cancel = false;
    if (idx >= 1) {
      if (item.type === 'warranty') {
        content = idx <= Number(item.warranty_months || 0) ? '保修中' : '保修外';
      } else {
        const amount = resolvePlanPrice(item.price_phases, idx);
        cancel = item.type !== 'insurance' && isInCancel(item.cancel_windows, idx);
        if (amount != null && !cancel) content = fmtMoney(amount, item.currency);
        if (amount != null && cancel) content = '退会期';
        if (item.balance && item.balance_from && idx >= item.balance_from && !cancel) {
          let remain = item.balance;
          for (let i = item.balance_from; i <= idx; i++) {
            const current = resolvePlanPrice(item.price_phases, i);
            if (current && current > 0) remain = Math.max(0, remain - current);
          }
          sub = `余额：${fmtMoney(remain, item.currency)}`;
        }
      }
    }
    const background = isToday ? '#eef5ff' : cancel ? '#fff6f1' : '#fff';
    const borderColor = isToday ? '#dbe8ff' : cancel ? '#ffd8bf' : '#eef0f3';
    return { idx, content, sub, background, borderColor };
  }

  const currentType = draft.type || 'plan';
  const showPlanBlock = currentType === 'plan' || currentType === 'insurance';
  const showFiscal = showPlanBlock && draft.cycle === 'yearly';

  return (
    <div style={{ maxWidth: 1200, margin: '18px auto', padding: '0 12px', color: '#0f172a' }}>
      {loading && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,.45)', zIndex: 10000 }}>
          <div style={{ width: 40, height: 40, border: '4px solid #eef0f3', borderTopColor: '#3b82f6', borderRadius: '50%' }} />
        </div>
      )}

      <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: 10, marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <b>费用时间轴</b>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            style={{ ...inputStyle, flex: 1, minWidth: 0 }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索项目/类型/编号/标签/分类..."
          />
          <button style={buttonBase} onClick={() => { setFilter(''); }}>清空</button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={{ ...primaryButton, flex: 1 }} onClick={openNewDialog}>添加项目</button>
          <button style={{ ...buttonBase, whiteSpace: 'nowrap', opacity: activeItem ? 1 : 0.5 }} disabled={!activeItem} onClick={openEditDialog}>编辑项目</button>
          <input ref={importRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={importItems} />
          <button style={buttonBase} onClick={() => importRef.current?.click()}>导入</button>
          <button style={buttonBase} onClick={exportItems}>导出</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: 10 }}>
          <div style={{ maxHeight: 'calc(72px * 4 + 24px)', overflowY: 'auto', paddingTop: 4, paddingLeft: 4, paddingRight: 6 }}>
            {items.map((item) => {
              let rightInfo = '';
              if (item.type === 'plan' && item.cancel_windows?.length) {
                const first = [...item.cancel_windows].sort((a, b) => a.fromMonth - b.fromMonth)[0].fromMonth;
                rightInfo = `退会开始月：第 ${first} 个月`;
              } else if (item.type === 'warranty' && item.warranty_months) {
                rightInfo = `保修终了月：第 ${item.warranty_months} 个月`;
              } else if (item.type === 'insurance') {
                const total = Number(item.policy_term_years || 0) * 12 + Number(item.policy_term_months || 0);
                if (total > 0) rightInfo = `保险到期月：第 ${total} 个月`;
              }
              return (
                <div
                  key={item.id}
                  onClick={() => setActiveId(item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '6px 10px',
                    borderRadius: 12,
                    border: '1px solid #eef0f3',
                    background: '#fff',
                    height: 72,
                    gap: 8,
                    marginBottom: 8,
                    cursor: 'pointer',
                    outline: item.id === activeItem?.id ? '2px solid #3b82f6' : 'none',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontWeight: 600 }}>
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{item.name}</span>
                      <span style={{ fontSize: 12, color: typeColor(item.type), flexShrink: 0 }}>{typeLabel(item.type)}</span>
                      <span style={{ marginLeft: 'auto', flexShrink: 1, fontSize: 12, color: '#667085', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>#{item.number || '-'}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                      <span>开始日: {item.start_date || '-'}</span>
                      {rightInfo && <span style={{ marginLeft: 8 }}>{rightInfo}</span>}
                    </div>
                    <div style={{ fontSize: 12, marginTop: 2, color: '#667085', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {item.category && <span>· {item.category}</span>}
                      {item.tags?.length ? <span style={{ marginLeft: 8 }}>· {item.tags.join('/')}</span> : null}
                    </div>
                  </div>
                </div>
              );
            })}
            {!items.length && <div style={{ fontSize: 12, color: '#667085', textAlign: 'center', padding: 20 }}>没有匹配的项目</div>}
          </div>
        </div>

        <div ref={gridRef} style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: 10, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 110px)`, gap: 8 }}>
              {months.map((month) => (
                <div key={month.ym} data-ym={month.ym} style={{ background: month.isToday ? '#eef5ff' : '#fff', border: `1px solid ${month.isToday ? '#dbe8ff' : '#eef0f3'}`, borderRadius: 10, padding: 8, whiteSpace: 'nowrap', fontSize: 12 }}>
                  {month.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {visibleItems.map((item) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 110px)`, gap: 8 }}>
                {months.map((month) => {
                  const cell = renderCell(item, month.date, month.isToday);
                  return (
                    <button
                      key={month.ym}
                      type="button"
                      onClick={() => editMonthAmount(item, cell.idx)}
                      disabled={item.type === 'warranty' || cell.idx < 1}
                      style={{
                        background: cell.background,
                        border: `1px solid ${cell.borderColor}`,
                        borderRadius: 10,
                        padding: 8,
                        color: '#0f172a',
                        fontSize: 12,
                        minHeight: 56,
                        textAlign: 'center',
                        cursor: item.type !== 'warranty' && cell.idx >= 1 ? 'pointer' : 'default',
                      }}
                    >
                      <div>{cell.content}</div>
                      {cell.sub && <div style={{ marginTop: 2, color: '#667085' }}>{cell.sub}</div>}
                    </button>
                  );
                })}
              </div>
            ))}
            {!visibleItems.length && (
              <div style={{ color: '#667085', fontSize: 12, padding: 16 }}>请在左侧选择一个项目，或点击“添加项目”。</div>
            )}
          </div>
        </div>
      </div>

      {dialogOpen && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)', zIndex: 9999 }} onClick={(e) => { if (e.target === e.currentTarget) setDialogOpen(false); }}>
          <div style={{ width: 'min(680px,92vw)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 12px 32px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3 style={{ margin: 0 }}>{editingId ? '编辑项目' : '新增项目'}</h3>
              <button style={buttonBase} onClick={() => setDialogOpen(false)}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <select style={{ ...inputStyle, width: 120 }} value={currentType} onChange={(e) => patchDraft({ type: e.target.value as ItemType })}>
                <option value="plan">套餐</option>
                <option value="warranty">保修</option>
                <option value="insurance">保险</option>
              </select>
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} placeholder="项目名称" value={draft.name || ''} onChange={(e) => patchDraft({ name: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <input style={{ ...inputStyle, width: '100%' }} placeholder="编号/卡号(可选)" value={draft.number || ''} onChange={(e) => patchDraft({ number: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, color: '#667085' }}>开始日</label>
              <input type="date" style={{ ...inputStyle, width: 140 }} value={draft.start_date || ''} onChange={(e) => patchDraft({ start_date: e.target.value })} />
              <label style={{ fontSize: 12, color: '#667085' }}>货币</label>
              <select style={{ ...inputStyle, width: 120 }} value={draft.currency || 'CNY'} onChange={(e) => patchDraft({ currency: e.target.value })}>
                <option value="CNY">CNY ￥</option>
                <option value="JPY">JPY ¥</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <input style={{ ...inputStyle, width: '50%' }} placeholder="分类（可选）" value={draft.category || ''} onChange={(e) => patchDraft({ category: e.target.value })} />
              <input style={{ ...inputStyle, flex: 1, minWidth: 0 }} placeholder="标签，用逗号分隔（可选）" value={(draft.tags || []).join(', ')} onChange={(e) => patchDraft({ tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })} />
            </div>

            {showPlanBlock && (
              <>
                <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ fontSize: 12, color: '#667085' }}>周期</label>
                  <select style={{ ...inputStyle, width: 120 }} value={draft.cycle || 'monthly'} onChange={(e) => patchDraft({ cycle: e.target.value as Cycle })}>
                    <option value="monthly">月度</option>
                    <option value="yearly">年次</option>
                  </select>
                  {showFiscal && (
                    <>
                      <label style={{ fontSize: 12, color: '#667085' }}>决算月</label>
                      <select style={{ ...inputStyle, width: 120 }} value={draft.fiscal_month || 1} onChange={(e) => patchDraft({ fiscal_month: Number(e.target.value) })}>
                        {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
                      </select>
                    </>
                  )}
                </div>

                <fieldset style={{ border: '1px dashed #eef0f3', borderRadius: 10, padding: 8, marginTop: 6 }}>
                  <legend style={{ fontSize: 12, color: '#667085' }}>金额（从第 X 个月起，金额 / 月）</legend>
                  {(draft.price_phases || []).map((phase, index) => (
                    <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: '#667085' }}>第</span>
                      <input type="number" min={1} style={{ ...inputStyle, width: 60 }} value={phase.fromMonth} onChange={(e) => setPhase(index, { fromMonth: Number(e.target.value) || 1 })} />
                      <span style={{ fontSize: 12, color: '#667085' }}>个月起</span>
                      <input type="number" step="0.01" style={{ ...inputStyle, width: 100 }} value={phase.amount} onChange={(e) => setPhase(index, { amount: Number(e.target.value) || 0 })} />
                      <span style={{ fontSize: 12, color: '#667085' }}>/月</span>
                      <button style={{ ...buttonBase, width: 34, height: 34, borderRadius: '50%', padding: 0, background: '#fff0f0', color: '#d93025', border: '1px solid #f5c6cb' }} onClick={() => patchDraft({ price_phases: (draft.price_phases || []).filter((_, i) => i !== index) })}>−</button>
                    </div>
                  ))}
                  <button style={{ ...buttonBase, width: 34, height: 34, borderRadius: '50%', padding: 0, background: '#e6f7ff', color: '#1890ff', border: '1px solid #b0dfff' }} onClick={() => patchDraft({ price_phases: [...(draft.price_phases || []), { fromMonth: 1, amount: 0 }] })}>＋</button>
                </fieldset>

                {currentType !== 'insurance' && (
                  <fieldset style={{ border: '1px dashed #eef0f3', borderRadius: 10, padding: 8, marginTop: 6 }}>
                    <legend style={{ fontSize: 12, color: '#667085' }}>退会（从第 X ～ 第 Y 个月为退会期）</legend>
                    {(draft.cancel_windows || []).map((window, index) => (
                      <div key={index} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: '6px 0', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#667085' }}>第</span>
                        <input type="number" min={1} style={{ ...inputStyle, width: 60 }} value={window.fromMonth} onChange={(e) => setCancelWindow(index, { fromMonth: Number(e.target.value) || 1 })} />
                        <span style={{ fontSize: 12, color: '#667085' }}>-</span>
                        <input type="number" min={1} style={{ ...inputStyle, width: 60 }} value={window.toMonth} onChange={(e) => setCancelWindow(index, { toMonth: Number(e.target.value) || 1 })} />
                        <span style={{ fontSize: 12, color: '#667085' }}>个月</span>
                        <button style={{ ...buttonBase, width: 34, height: 34, borderRadius: '50%', padding: 0, background: '#fff0f0', color: '#d93025', border: '1px solid #f5c6cb' }} onClick={() => patchDraft({ cancel_windows: (draft.cancel_windows || []).filter((_, i) => i !== index) })}>−</button>
                      </div>
                    ))}
                    <button style={{ ...buttonBase, width: 34, height: 34, borderRadius: '50%', padding: 0, background: '#e6f7ff', color: '#1890ff', border: '1px solid #b0dfff' }} onClick={() => patchDraft({ cancel_windows: [...(draft.cancel_windows || []), { fromMonth: 1, toMonth: 1 }] })}>＋</button>
                  </fieldset>
                )}

                {currentType === 'insurance' && (
                  <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <label style={{ fontSize: 12, color: '#667085' }}>保期</label>
                    <input type="number" min={0} placeholder="年" style={{ ...inputStyle, width: 80 }} value={draft.policy_term_years ?? ''} onChange={(e) => patchDraft({ policy_term_years: Number(e.target.value) || 0 })} />
                    <input type="number" min={0} max={11} placeholder="月" style={{ ...inputStyle, width: 80 }} value={draft.policy_term_months ?? ''} onChange={(e) => patchDraft({ policy_term_months: Number(e.target.value) || 0 })} />
                  </div>
                )}
              </>
            )}

            {currentType === 'warranty' && (
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <label style={{ fontSize: 12, color: '#667085' }}>保修期（月）</label>
                <input type="number" min={0} style={{ ...inputStyle, width: 120 }} value={draft.warranty_months ?? 24} onChange={(e) => patchDraft({ warranty_months: Number(e.target.value) || 0 })} />
              </div>
            )}

            {msg && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 10, textAlign: 'right' }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
              {editingId && <button style={{ ...buttonBase, color: '#d93025', background: '#fff0f0', border: '1px solid #f5c6cb' }} onClick={deleteItem}>删除</button>}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button style={buttonBase} onClick={() => setDialogOpen(false)}>取消</button>
                <button style={primaryButton} onClick={saveItem}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
