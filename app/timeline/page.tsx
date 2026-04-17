'use client';

import { useEffect, useState, useMemo, useCallback } from 'react';
import { apiJson } from '@/lib/client';

type ItemType = 'plan' | 'warranty' | 'insurance';
type Cycle = 'monthly' | 'yearly';

interface PricePhase {
  fromMonth: number;
  amount: number;
}

interface CancelWindow {
  fromMonth: number;
  toMonth: number;
}

interface TimelineItem {
  id: string;
  type: ItemType;
  name: string;
  number?: string;
  startDate: string;
  currency: string;
  category?: string;
  tags?: string[];
  warrantyMonths?: number;
  cycle?: Cycle;
  fiscalMonth?: number;
  pricePhases?: PricePhase[];
  cancelWindows?: CancelWindow[];
  policyTermYears?: number;
  policyTermMonths?: number;
  sortOrder?: number;
}

const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: '￥',
  JPY: 'JP￥',
  USD: '$',
  EUR: '€',
};

function fmtMoney(amount: number, currency: string = 'CNY'): string {
  const num = Math.round(amount).toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  return `${CURRENCY_SYMBOLS[currency] ?? (currency + ' ')} ${num}`;
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n);
}

function parseISODate(s: string): Date {
  if (!s) return new Date();
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}

function resolvePlanPrice(sortedPhases: PricePhase[] | undefined, idx: number): number | null {
  if (!sortedPhases?.length) return null;
  let a: number | null = null;
  sortedPhases.forEach(p => { if (idx >= p.fromMonth) a = p.amount; });
  return a;
}

function isInCancel(w: CancelWindow[] | undefined, idx: number): boolean {
  return w?.some?.(x => idx >= x.fromMonth && idx <= x.toMonth) ?? false;
}

export default function TimelinePage() {
  const [items, setItems] = useState<TimelineItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<TimelineItem | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [filter, setFilter] = useState('');
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await apiJson<{ items: TimelineItem[] }>('/api/timeline');
      setItems(data.items ?? []);
    } catch (e: any) {
      setMsg(e.message || '加载失败');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (!filter) return items;
    const s = filter.toLowerCase();
    return items.filter(it => 
      [it.name, it.type, it.number, it.category, ...(it.tags || [])].filter(Boolean).join(' ').toLowerCase().includes(s)
    );
  }, [items, filter]);

  const visibleItems = useMemo(() => {
    return activeId ? filtered.filter(i => i.id === activeId) : (filtered.length ? [filtered[0]] : []);
  }, [filtered, activeId]);

  const openDialog = (item: TimelineItem | null) => {
    setEditingItem(item || {
      id: '',
      type: 'plan',
      name: '',
      startDate: '',
      currency: 'CNY',
      pricePhases: [{ fromMonth: 1, amount: 0 }],
      cancelWindows: [],
    } as TimelineItem);
    setShowDialog(true);
  };

  const closeDialog = () => {
    setShowDialog(false);
    setEditingItem(null);
    setMsg('');
  };

  const saveItem = async () => {
    if (!editingItem) return;
    if (!editingItem.name.trim()) {
      setMsg('请填写项目名称');
      return;
    }
    if (!editingItem.startDate) {
      setMsg('请选择开始日期');
      return;
    }

    try {
      if (editingItem.id) {
        await apiJson(`/api/timeline/${editingItem.id}`, { method: 'PUT', body: JSON.stringify(editingItem) });
      } else {
        await apiJson('/api/timeline', { method: 'POST', body: JSON.stringify(editingItem) });
      }
      await load();
      closeDialog();
    } catch (e: any) {
      setMsg(e.message || '保存失败');
    }
  };

  const deleteItem = async (id: string) => {
    if (!confirm('删除这个项目？')) return;
    await apiJson(`/api/timeline/${id}`, { method: 'DELETE' });
    if (activeId === id) setActiveId(null);
    await load();
  };

  // 生成月份列
  const months = useMemo(() => {
    const result: { ym: string; label: string; isToday: boolean }[] = [];
    const today = new Date();
    const todayYM = `${today.getFullYear()}-${pad2(today.getMonth() + 1)}`;
    
    for (let i = -12; i <= 36; i++) {
      const d = addMonths(new Date(), i);
      const ym = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
      result.push({
        ym,
        label: `${d.getFullYear()}/${pad2(d.getMonth() + 1)}`,
        isToday: ym === todayYM,
      });
    }
    return result;
  }, []);

  return (
    <div style={{ maxWidth: 1200, margin: '18px auto', padding: '0 12px' }}>
      <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: 10, marginBottom: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
          <b>费用时间轴</b>
        </div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
          <input
            style={{ flex: 1, minWidth: 0, border: '1px solid #eef0f3', borderRadius: 10, padding: '8px 10px' }}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="搜索项目/类型/编号/标签/分类..."
          />
          <button style={{ background: '#eceff3', color: '#111827', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => setFilter('')}>清空</button>
          <button style={{ background: '#eceff3', color: '#111827', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => setShowStats(true)}>统计</button>
        </div>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button style={{ flex: 1, background: '#3b82f6', color: '#fff', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => openDialog(null)}>添加项目</button>
          <button style={{ background: '#eceff3', color: '#111827', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer', whiteSpace: 'nowrap' }} onClick={() => activeId && openDialog(items.find(i => i.id === activeId) || null)}>编辑项目</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: 14, alignItems: 'start' }}>
        <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: 10 }}>
          <div style={{ maxHeight: 'calc(72px * 4 + 24px)', overflowY: 'auto', paddingTop: 4, paddingLeft: 4, paddingRight: 6 }}>
            {filtered.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveId(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '6px 10px',
                  borderRadius: 12,
                  border: `1px solid ${activeId === item.id ? '#3b82f6' : '#eef0f3'}`,
                  background: '#fff',
                  height: 72,
                  gap: 8,
                  marginBottom: 8,
                  cursor: 'pointer',
                  outline: activeId === item.id ? '2px solid #3b82f6' : 'none',
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontWeight: 600 }}>
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{item.name}</span>
                    {item.number && <span style={{ marginLeft: 'auto', flexShrink: 1, fontSize: 12, color: '#667085', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>{item.number}</span>}
                  </div>
                  <div style={{ fontSize: 12, color: '#667085', marginTop: 2 }}>
                    {item.type === 'plan' ? '套餐' : item.type === 'warranty' ? '保修' : '保险'} · {item.startDate}
                  </div>
                  {item.category && <div style={{ fontSize: 12, marginTop: 2 }}>{item.category}</div>}
                </div>
              </div>
            ))}
            {!filtered.length && <div style={{ fontSize: 12, color: '#667085', textAlign: 'center', padding: 20 }}>没有匹配的项目</div>}
          </div>
        </div>

        <div style={{ background: '#fff', border: '1px solid #eef0f3', borderRadius: 14, padding: 10, overflowX: 'auto' }}>
          <div style={{ display: 'grid', gap: 8, marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 110px)`, gap: 8 }}>
              {months.map(m => (
                <div key={m.ym} style={{ background: m.isToday ? '#eef5ff' : '#fff', border: `1px solid ${m.isToday ? '#dbe8ff' : '#eef0f3'}`, borderRadius: 10, padding: 8, whiteSpace: 'nowrap', fontSize: 12 }}>
                  {m.label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            {visibleItems.map(item => {
              const start = parseISODate(item.startDate);
              return (
                <div key={item.id} style={{ display: 'grid', gridTemplateColumns: `repeat(${months.length}, 110px)`, gap: 8 }}>
                  {months.map((m, idx) => {
                    const monthDate = parseISODate(m.ym + '-01');
                    const monthIdx = Math.floor((monthDate.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 30)) + 1;
                    
                    let content = '';
                    let bgColor = '#fff';
                    let borderColor = '#eef0f3';

                    if (monthIdx >= 1) {
                      if (item.type === 'warranty') {
                        if (monthIdx <= (item.warrantyMonths || 0)) {
                          content = '保修中';
                          bgColor = '#eef5ff';
                          borderColor = '#dbe8ff';
                        }
                      } else {
                        const price = resolvePlanPrice(item.pricePhases, monthIdx);
                        if (price !== null) {
                          const inCancel = isInCancel(item.cancelWindows, monthIdx);
                          content = inCancel ? '退会期' : fmtMoney(price, item.currency);
                          bgColor = inCancel ? '#fff6f1' : '#eef5ff';
                          borderColor = inCancel ? '#ffd8bf' : '#dbe8ff';
                        }
                      }
                    }

                    return (
                      <div key={m.ym} style={{ background: bgColor, border: `1px solid ${borderColor}`, borderRadius: 10, padding: 8, fontSize: 12, minHeight: 40 }}>
                        {content}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showDialog && editingItem && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)', zIndex: 9999 }} onClick={(e) => e.target === e.currentTarget && closeDialog()}>
          <div style={{ width: 'min(680px,92vw)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 14, boxShadow: '0 12px 32px rgba(0,0,0,.18)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3>{editingItem.id ? '编辑项目' : '新建项目'}</h3>
              <button style={{ background: '#eceff3', color: '#111827', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={closeDialog}>×</button>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <select style={{ width: 120, border: '1px solid #eef0f3', borderRadius: 10, padding: '8px 10px' }} value={editingItem.type} onChange={(e) => setEditingItem({ ...editingItem, type: e.target.value as ItemType })}>
                <option value="plan">套餐</option>
                <option value="warranty">保修</option>
                <option value="insurance">保险</option>
              </select>
              <input style={{ flex: 1, minWidth: 0, border: '1px solid #eef0f3', borderRadius: 10, padding: '8px 10px' }} placeholder="项目名称" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
              <input style={{ width: '100%', border: '1px solid #eef0f3', borderRadius: 10, padding: '8px 10px' }} placeholder="编号/卡号(可选)" value={editingItem.number || ''} onChange={(e) => setEditingItem({ ...editingItem, number: e.target.value })} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 8, alignItems: 'center' }}>
              <label style={{ fontSize: 12, color: '#667085' }}>开始日</label>
              <input type="date" style={{ width: 140, border: '1px solid #eef0f3', borderRadius: 10, padding: '8px 10px' }} value={editingItem.startDate} onChange={(e) => setEditingItem({ ...editingItem, startDate: e.target.value })} />
              <label style={{ fontSize: 12, color: '#667085' }}>货币</label>
              <select style={{ width: 120, border: '1px solid #eef0f3', borderRadius: 10, padding: '8px 10px' }} value={editingItem.currency} onChange={(e) => setEditingItem({ ...editingItem, currency: e.target.value })}>
                <option value="CNY">CNY ￥</option>
                <option value="JPY">JPY ¥</option>
                <option value="USD">USD $</option>
                <option value="EUR">EUR €</option>
              </select>
            </div>

            {msg && <div style={{ fontSize: 12, color: '#ef4444', marginTop: 10, textAlign: 'right' }}>{msg}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', marginTop: 12 }}>
              {editingItem.id && <button style={{ color: '#d93025', background: '#fff0f0', border: '1px solid #f5c6cb', borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => { deleteItem(editingItem.id); closeDialog(); }}>删除</button>}
              <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
                <button style={{ background: '#eceff3', color: '#111827', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={closeDialog}>取消</button>
                <button style={{ background: '#3b82f6', color: '#fff', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={saveItem}>保存</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showStats && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.35)', zIndex: 9999 }} onClick={(e) => e.target === e.currentTarget && setShowStats(false)}>
          <div style={{ width: 'min(820px,92vw)', maxHeight: '92vh', overflow: 'auto', background: '#fff', borderRadius: 14, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <h3>统计与汇总</h3>
              <button style={{ background: '#eceff3', color: '#111827', border: 0, borderRadius: 10, padding: '8px 12px', cursor: 'pointer' }} onClick={() => setShowStats(false)}>×</button>
            </div>
            <div style={{ fontSize: 14, color: '#667085' }}>
              共 {items.length} 个项目
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
