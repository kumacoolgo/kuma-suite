'use client';

import { useEffect, useMemo, useState } from 'react';
import { apiJson } from '@/lib/client';
import type { VaultItem } from '@/lib/types';
import { copyText } from '@/components/common';

function genPassword(len = 16) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*()-_=+';
  const buf = new Uint32Array(len);
  crypto.getRandomValues(buf);
  return Array.from(buf).map((n) => alphabet[n % alphabet.length]).join('');
}

function due(item: VaultItem) {
  if (item.due_date) return item.due_date.slice(0, 10);
  if (item.created_at && item.valid_days) {
    const d = new Date(item.created_at);
    d.setDate(d.getDate() + item.valid_days);
    return d.toISOString().slice(0, 10);
  }
  return '';
}

const blank: Partial<VaultItem> = { category: '', url: 'https://', username: '', password: '', created_at: new Date().toISOString(), valid_days: null, due_date: null };

export default function VaultPage() {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<VaultItem>>(blank);
  const [q, setQ] = useState('');
  const [msg, setMsg] = useState('');

  async function load() {
    const data = await apiJson<{ items: VaultItem[] }>('/api/vault');
    setItems(data.items || []);
    if (data.items?.length && !selectedId) setSelectedId(data.items[0].id);
    if (!data.items?.length) setSelectedId(null);
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);
  useEffect(() => {
    const item = items.find((i) => i.id === selectedId) || null;
    setDraft(item ?? blank);
  }, [selectedId, items]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return items;
    return items.filter((it) => [it.category, it.url, it.username].filter(Boolean).join(' ').toLowerCase().includes(s));
  }, [items, q]);

  async function save() {
    setMsg('');
    try {
      const payload = { ...draft };
      let savedId = selectedId;
      if (selectedId) {
        await apiJson(`/api/vault/${selectedId}`, { method: 'PUT', body: JSON.stringify(payload) });
      } else {
        const res = await apiJson<{ item: VaultItem }>('/api/vault', { method: 'POST', body: JSON.stringify(payload) });
        savedId = res.item.id;
      }
      await load();
      setSelectedId(savedId);
      setMsg('已保存');
    } catch (e: any) {
      setMsg(e.message || '保存失败');
    }
  }

  async function remove(id: string) {
    if (!confirm('删除这条密码记录？')) return;
    await apiJson(`/api/vault/${id}`, { method: 'DELETE' });
    if (selectedId === id) setSelectedId(null);
    await load();
  }

  return (
    <div className="page stack">
      <section className="panel">
        <div className="panel-head">
          <h2>密码库</h2>
          <div className="actions">
            <input style={{ width: 240 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="搜索分类 / 网址 / 用户名" />
            <button className="btn primary" onClick={() => { setSelectedId(null); setDraft(blank); }}>新建</button>
          </div>
        </div>
        <div className="panel-body grid">
          <div className="stack">
            <div className="card-list">
              {filtered.map((item) => (
                <button key={item.id} className={`card ${selectedId === item.id ? 'active' : ''}`} onClick={() => setSelectedId(item.id)} style={{ textAlign: 'left' }}>
                  <div className="card-head">
                    <div>
                      <div style={{ fontWeight: 800 }}>{item.category || '未分类'}</div>
                      <div className="muted tiny">{item.url}</div>
                    </div>
                    <div className="badge">{due(item) || '无到期日'}</div>
                  </div>
                  <div className="muted tiny">{item.username || '无用户名'}</div>
                </button>
              ))}
              {!filtered.length && <div className="empty">没有匹配的条目。</div>}
            </div>
          </div>

          <div className="panel" style={{ background: 'rgba(10,15,28,.82)' }}>
            <div className="panel-head">
              <h3>{selectedId ? '编辑条目' : '新建条目'}</h3>
              <div className="actions">
                {selectedId && <button className="btn danger" onClick={() => remove(selectedId)}>删除</button>}
                <button className="btn primary" onClick={save}>{selectedId ? '保存' : '创建'}</button>
              </div>
            </div>
            <div className="panel-body stack">
              <div className="row cols-2">
                <input value={draft.category || ''} onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))} placeholder="分类" />
                <input value={draft.url || ''} onChange={(e) => setDraft((d) => ({ ...d, url: e.target.value }))} placeholder="网址" />
              </div>
              <div className="row cols-2">
                <input value={draft.username || ''} onChange={(e) => setDraft((d) => ({ ...d, username: e.target.value }))} placeholder="用户名" />
                <input value={draft.password || ''} onChange={(e) => setDraft((d) => ({ ...d, password: e.target.value }))} placeholder="密码" autoComplete="new-password" />
              </div>
              <div className="row cols-3">
                <input value={draft.created_at || ''} onChange={(e) => setDraft((d) => ({ ...d, created_at: e.target.value }))} placeholder="创建时间" />
                <input type="number" value={draft.valid_days ?? ''} onChange={(e) => setDraft((d) => ({ ...d, valid_days: e.target.value === '' ? null : Number(e.target.value) }))} placeholder="有效天数" />
                <input value={draft.due_date || ''} onChange={(e) => setDraft((d) => ({ ...d, due_date: e.target.value }))} placeholder="到期时间" />
              </div>
              <div className="actions">
                <button className="btn" onClick={() => setDraft((d) => ({ ...d, password: genPassword(20) }))}>生成密码</button>
                <button className="btn" onClick={async () => { if (draft.url) { await copyText(draft.url); setMsg('已复制网址'); } }}>复制网址</button>
                <button className="btn" onClick={async () => { if (draft.username) { await copyText(draft.username); setMsg('已复制用户名'); } }}>复制用户名</button>
                <button className="btn" onClick={async () => { if (draft.password) { await copyText(draft.password); setMsg('已复制密码'); } }}>复制密码</button>
              </div>
              {msg && <div className="card"><div className="badge red">提示</div><div>{msg}</div></div>}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
