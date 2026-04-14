'use client';

import type { CSSProperties } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { apiJson, uploadFile } from '@/lib/client';
import type { BlogSummary } from '@/lib/types';
import { copyText } from '@/components/common';

type BlogPayload = BlogSummary & { message?: string };

const blankSummary: BlogSummary = {
  profile: { id: 1, name: 'Kuma', bio: '', avatar_url: null, background_url: null },
  links: [],
};

export default function BlogPage() {
  const [data, setData] = useState<BlogSummary>(blankSummary);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [profileDraft, setProfileDraft] = useState(blankSummary.profile);
  const [linkDraft, setLinkDraft] = useState({ title: '', url: '', icon: '' });

  async function load() {
    setLoading(true);
    try {
      const result = await apiJson<BlogPayload>('/api/blog');
      setData(result);
      setProfileDraft(result.profile);
    } catch (err: any) {
      setMessage(err?.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const links = useMemo(() => [...data.links].sort((a, b) => a.sort_order - b.sort_order), [data.links]);
      const bgStyle = useMemo(() => {
        if (profileDraft.background_url) return { '--hero-bg': `url(${profileDraft.background_url})` } as CSSProperties;
        return {} as CSSProperties;
      }, [profileDraft.background_url]);

  async function saveProfile() {
    setSaving(true);
    setMessage('');
    try {
      const result = await apiJson<BlogSummary['profile']>('/api/profile', {
        method: 'PUT',
        body: JSON.stringify(profileDraft),
      });
      setData((prev) => ({ ...prev, profile: result }));
      setMessage('资料已保存');
    } catch (err: any) {
      setMessage(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function addOrUpdateLink() {
    setSaving(true);
    setMessage('');
    try {
      const payload = { ...linkDraft, icon: linkDraft.icon || null };
      if (editingLinkId) {
        await apiJson('/api/links/' + editingLinkId, { method: 'PUT', body: JSON.stringify(payload) });
        setMessage('链接已更新');
      } else {
        await apiJson('/api/links', { method: 'POST', body: JSON.stringify(payload) });
        setMessage('链接已新增');
      }
      setLinkDraft({ title: '', url: '', icon: '' });
      setEditingLinkId(null);
      await load();
    } catch (err: any) {
      setMessage(err?.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function deleteLink(id: string) {
    if (!confirm('删除这条链接？')) return;
    await apiJson('/api/links/' + id, { method: 'DELETE' });
    await load();
  }

  async function moveLink(id: string, direction: 'up' | 'down') {
    await apiJson('/api/links/reorder', { method: 'POST', body: JSON.stringify({ id, direction }) });
    await load();
  }

  async function uploadAndSet(field: 'avatar_url' | 'background_url', file: File) {
    const result = await uploadFile('/api/assets', file);
    const url = result?.url;
    if (!url) return;
    setProfileDraft((prev) => ({ ...prev, [field]: url }));
  }

  return (
    <div className="page stack">
      <section className="hero">
        <div className="hero-banner" style={bgStyle}>
          <div className="badge">blog2 · 首页</div>
          <div className="name">{profileDraft.name || 'Kuma'}</div>
          <div className="muted" style={{ marginTop: 8 }}>{profileDraft.bio || '这里是简介'}</div>
        </div>
        <div className="panel">
          <div className="panel-head"><h2>快速操作</h2><span className="badge green">PostgreSQL</span></div>
          <div className="panel-body stack">
            <div className="split">
              <div className="card">
                <div className="badge">头像</div>
                <img className="avatar" src={profileDraft.avatar_url || '/default-avatar.svg'} alt="avatar" />
                <input value={profileDraft.avatar_url || ''} onChange={(e) => setProfileDraft((p) => ({ ...p, avatar_url: e.target.value || null }))} placeholder="头像 URL" />
                <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadAndSet('avatar_url', file); e.currentTarget.value = ''; }} />
              </div>
              <div className="card">
                <div className="badge">背景</div>
                <input value={profileDraft.background_url || ''} onChange={(e) => setProfileDraft((p) => ({ ...p, background_url: e.target.value || null }))} placeholder="背景 URL" />
                <input type="file" accept="image/*" onChange={async (e) => { const file = e.target.files?.[0]; if (file) await uploadAndSet('background_url', file); e.currentTarget.value = ''; }} />
              </div>
            </div>
            <input value={profileDraft.name} onChange={(e) => setProfileDraft((p) => ({ ...p, name: e.target.value }))} placeholder="名称" />
            <textarea value={profileDraft.bio} onChange={(e) => setProfileDraft((p) => ({ ...p, bio: e.target.value }))} placeholder="简介" style={{ minHeight: 110 }} />
            <div className="actions">
              <button className="btn primary" onClick={saveProfile} disabled={saving}>保存主页</button>
              <button className="btn ghost" onClick={() => load()}>刷新</button>
            </div>
          </div>
        </div>
      </section>

      <section className="grid">
        <div className="panel">
          <div className="panel-head"><h2>链接管理</h2><span className="badge">{links.length} 条</span></div>
          <div className="panel-body stack">
            <div className="row cols-3">
              <input value={linkDraft.title} onChange={(e) => setLinkDraft((d) => ({ ...d, title: e.target.value }))} placeholder="标题" />
              <input value={linkDraft.url} onChange={(e) => setLinkDraft((d) => ({ ...d, url: e.target.value }))} placeholder="网址" />
              <input value={linkDraft.icon} onChange={(e) => setLinkDraft((d) => ({ ...d, icon: e.target.value }))} placeholder="图标 / emoji / URL" />
            </div>
            <div className="actions">
              <button className="btn primary" onClick={addOrUpdateLink} disabled={saving}>{editingLinkId ? '更新链接' : '新增链接'}</button>
              {editingLinkId && <button className="btn ghost" onClick={() => { setEditingLinkId(null); setLinkDraft({ title: '', url: '', icon: '' }); }}>取消编辑</button>}
            </div>
            <div className="card-list">
              {links.map((link, idx) => (
                <div key={link.id} className="card">
                  <div className="card-head">
                    <div>
                      <div style={{ fontWeight: 700 }}>{link.icon || '🔗'} {link.title}</div>
                      <div className="muted tiny">{link.url}</div>
                    </div>
                    <div className="actions">
                      <button className="btn small" onClick={() => copyText(link.url)}>复制</button>
                      <button className="btn small" onClick={() => { setEditingLinkId(link.id); setLinkDraft({ title: link.title, url: link.url, icon: link.icon || '' }); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>编辑</button>
                      <button className="btn small" onClick={() => moveLink(link.id, 'up')} disabled={idx === 0}>↑</button>
                      <button className="btn small" onClick={() => moveLink(link.id, 'down')} disabled={idx === links.length - 1}>↓</button>
                      <a className="btn small" href={link.url} target="_blank" rel="noreferrer">打开</a>
                      <button className="btn small danger" onClick={() => deleteLink(link.id)}>删除</button>
                    </div>
                  </div>
                </div>
              ))}
              {!links.length && <div className="empty">还没有链接，先加一个。</div>}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head"><h2>状态</h2></div>
          <div className="panel-body stack">
            <div className="card">
              <div className="badge green">单体部署</div>
              <div>博客主页、游戏测试记录、费用时间轴、文本板、密码库都在同一个镜像中。</div>
            </div>
            <div className="card">
              <div className="badge blue">登录</div>
              <div>整个站点使用浏览器原生 HTTP Basic Auth。</div>
            </div>
            <div className="card">
              <div className="badge orange">数据</div>
              <div>所有业务数据都落在 PostgreSQL。</div>
            </div>
            {message && <div className="card"><div className="badge red">提示</div><div>{message}</div></div>}
            {loading && <div className="muted">加载中…</div>}
          </div>
        </div>
      </section>
    </div>
  );
}
