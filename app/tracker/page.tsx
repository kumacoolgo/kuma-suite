'use client';

import { useEffect, useMemo, useState } from 'react';
import type { GameTask } from '@/lib/types';
import { apiJson, uploadFile } from '@/lib/client';
import { downloadFile } from '@/components/common';

const emptyTask: Partial<GameTask> = { test_name: '', publisher: '', start_date: '', end_date: '', test_case: '', test_result: '', gamepack: '', work_time: '', income1: '', received_date1: '', payment: '', income2: '', received_date2: '' };

function Field({ label, value, onChange, textarea = false }: { label: string; value: any; onChange: (v: string) => void; textarea?: boolean }) {
  return (
    <label className="stack" style={{ gap: 6 }}>
      <span className="muted tiny">{label}</span>
      {textarea ? <textarea value={value ?? ''} onChange={(e) => onChange(e.target.value)} /> : <input value={value ?? ''} onChange={(e) => onChange(e.target.value)} />}
    </label>
  );
}

export default function TrackerPage() {
  const [items, setItems] = useState<GameTask[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [draft, setDraft] = useState<Partial<GameTask>>(emptyTask);
  const [msg, setMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const selected = useMemo(() => items.find((i) => i.id === selectedId) ?? null, [items, selectedId]);

  async function load() {
    setLoading(true);
    try {
      const data = await apiJson<{ items: GameTask[] }>('/api/tracker');
      setItems(data.items || []);
      if (data.items?.length && !selectedId) setSelectedId(data.items[0].id);
      if (!data.items?.length) setSelectedId(null);
    } catch (e: any) {
      setMsg(e?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { setDraft(selected ?? emptyTask); }, [selectedId, selected]);

  async function save() {
    setMsg('');
    try {
      const payload = { ...draft };
      if (selected) {
        await apiJson(`/api/tracker/${selected.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        setMsg('已保存');
      } else {
        const res = await apiJson<{ item: GameTask }>('/api/tracker', { method: 'POST', body: JSON.stringify(payload) });
        setSelectedId(res.item.id);
        setMsg('已新增');
      }
      await load();
    } catch (e: any) {
      setMsg(e?.message || '保存失败');
    }
  }

  async function remove(id: number) {
    if (!confirm('删除这条记录？')) return;
    await apiJson(`/api/tracker/${id}`, { method: 'DELETE' });
    setSelectedId(null);
    await load();
  }

  async function move(id: number, direction: 'up' | 'down') {
    await apiJson('/api/tracker/reorder', { method: 'POST', body: JSON.stringify({ id, direction }) });
    await load();
  }

  async function exportXlsx() {
    const res = await fetch('/api/tracker/export', { credentials: 'include' });
    if (!res.ok) throw new Error(await res.text());
    downloadFile('game-test-tracker.xlsx', await res.blob());
  }

  async function importXlsx(file: File) {
    await uploadFile('/api/tracker/import', file);
    await load();
  }

  return (
    <div className="page stack">
      <section className="panel">
        <div className="panel-head">
          <h2>游戏测试记录</h2>
          <div className="actions">
            <button className="btn" onClick={exportXlsx}>导出 Excel</button>
            <label className="btn">
              导入 Excel
              <input type="file" accept=".xlsx,.xls" hidden onChange={async (e) => { const file = e.target.files?.[0]; if (file) await importXlsx(file); e.currentTarget.value = ''; }} />
            </label>
            <button className="btn primary" onClick={() => { setSelectedId(null); setDraft(emptyTask); }}>新建</button>
          </div>
        </div>
        <div className="panel-body grid">
          <div className="stack">
            <div className="card-list">
              {items.map((item, idx) => (
                <div key={item.id} className={`card ${selected?.id === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)}>
                  <div className="card-head">
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.test_name}</div>
                      <div className="muted tiny">{item.publisher || '—'} · {item.start_date || '无开始日期'} → {item.end_date || '—'}</div>
                    </div>
                    <div className="actions">
                      <button className="btn small" onClick={(e) => { e.stopPropagation(); move(item.id, 'up'); }} disabled={idx === 0}>↑</button>
                      <button className="btn small" onClick={(e) => { e.stopPropagation(); move(item.id, 'down'); }} disabled={idx === items.length - 1}>↓</button>
                      <button className="btn small danger" onClick={(e) => { e.stopPropagation(); remove(item.id); }}>删</button>
                    </div>
                  </div>
                  <div className="muted tiny">{item.test_case?.slice(0, 120) || '无测试用例'}{(item.test_case || '').length > 120 ? '…' : ''}</div>
                </div>
              ))}
              {!items.length && <div className="empty">没有记录，先新增一条。</div>}
            </div>
          </div>

          <div className="panel" style={{ background: 'rgba(10,15,28,.82)' }}>
            <div className="panel-head"><h3>{selected ? `编辑 #${selected.id}` : '新建记录'}</h3><span className="badge">PostgreSQL</span></div>
            <div className="panel-body stack">
              <div className="row cols-2">
                <Field label="测试名称" value={draft.test_name} onChange={(v) => setDraft((d) => ({ ...d, test_name: v }))} />
                <Field label="发行方" value={draft.publisher} onChange={(v) => setDraft((d) => ({ ...d, publisher: v }))} />
              </div>
              <div className="row cols-4">
                <Field label="开始日期" value={draft.start_date} onChange={(v) => setDraft((d) => ({ ...d, start_date: v }))} />
                <Field label="结束日期" value={draft.end_date} onChange={(v) => setDraft((d) => ({ ...d, end_date: v }))} />
                <Field label="工时" value={draft.work_time} onChange={(v) => setDraft((d) => ({ ...d, work_time: v }))} />
                <Field label="Gamepack" value={draft.gamepack} onChange={(v) => setDraft((d) => ({ ...d, gamepack: v }))} />
              </div>
              <div className="row cols-2">
                <Field label="测试用例" value={draft.test_case} onChange={(v) => setDraft((d) => ({ ...d, test_case: v }))} textarea />
                <Field label="测试结果" value={draft.test_result} onChange={(v) => setDraft((d) => ({ ...d, test_result: v }))} textarea />
              </div>
              <div className="row cols-2">
                <Field label="收入1" value={draft.income1} onChange={(v) => setDraft((d) => ({ ...d, income1: v }))} />
                <Field label="收款日期1" value={draft.received_date1} onChange={(v) => setDraft((d) => ({ ...d, received_date1: v }))} />
              </div>
              <div className="row cols-2">
                <Field label="付款" value={draft.payment} onChange={(v) => setDraft((d) => ({ ...d, payment: v }))} />
                <Field label="收入2" value={draft.income2} onChange={(v) => setDraft((d) => ({ ...d, income2: v }))} />
              </div>
              <Field label="收款日期2" value={draft.received_date2} onChange={(v) => setDraft((d) => ({ ...d, received_date2: v }))} />
              <div className="actions">
                <button className="btn primary" onClick={save}>{selected ? '保存' : '创建'}</button>
                <button className="btn ghost" onClick={() => selected ? setDraft(selected) : setDraft(emptyTask)}>重置</button>
              </div>
              {msg && <div className="card"><div className="badge red">提示</div><div>{msg}</div></div>}
              {loading && <div className="muted">加载中…</div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
