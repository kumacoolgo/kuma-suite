'use client';

import { useEffect, useRef, useState } from 'react';
import { apiJson } from '@/lib/client';
import type { BoardDocument } from '@/lib/types';

export default function BoardPage() {
  const [content, setContent] = useState('');
  const [fontSize, setFontSize] = useState(18);
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);
  const ref = useRef<HTMLTextAreaElement | null>(null);

  async function load() {
    const doc = await apiJson<BoardDocument>('/api/board');
    setContent(doc.content || '');
    setFontSize(doc.font_size_px || 18);
  }

  useEffect(() => { load().catch((e) => setMsg(e.message)); }, []);
  useEffect(() => {
    const el = ref.current;
    if (el) el.style.fontSize = `${fontSize}px`;
  }, [fontSize]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let startDistance = 0;
    let startFont = fontSize;
    const getDistance = (a: Touch, b: Touch) => Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    const onStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        startDistance = getDistance(e.touches[0], e.touches[1]);
        startFont = fontSize;
      }
    };
    const onMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && startDistance) {
        e.preventDefault();
        const dist = getDistance(e.touches[0], e.touches[1]);
        const next = Math.round(startFont * (dist / startDistance));
        setFontSize(Math.max(12, Math.min(40, next)));
      }
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchmove', onMove, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchmove', onMove);
    };
  }, [fontSize]);

  async function save() {
    setSaving(true);
    setMsg('');
    try {
      await apiJson('/api/board', { method: 'PUT', body: JSON.stringify({ content, font_size_px: fontSize }) });
      setMsg('已保存');
    } catch (e: any) {
      setMsg(e.message || '保存失败');
    } finally {
      setSaving(false);
    }
  }

  async function clearAll() {
    if (!confirm('清空全部内容？')) return;
    const doc = await apiJson<BoardDocument>('/api/board', { method: 'DELETE' });
    setContent(doc.content || '');
    setFontSize(doc.font_size_px || 18);
    setMsg('已清空');
  }

  return (
    <div className="page stack">
      <section className="panel">
        <div className="panel-head">
          <h2>文本板</h2>
          <div className="actions">
            <button className="btn" onClick={() => setFontSize((n) => Math.max(12, n - 1))}>A-</button>
            <button className="btn" onClick={() => setFontSize((n) => Math.min(40, n + 1))}>A+</button>
            <button className="btn danger" onClick={clearAll}>清空</button>
            <button className="btn primary" onClick={save} disabled={saving}>保存</button>
          </div>
        </div>
        <div className="panel-body stack">
          <textarea ref={ref} value={content} onChange={(e) => setContent(e.target.value)} placeholder="在这里输入文本…" style={{ minHeight: '65vh', lineHeight: 1.5 }} />
          <div className="muted tiny">字体大小：{fontSize}px · 双指缩放可调节</div>
          {msg && <div className="card"><div className="badge red">提示</div><div>{msg}</div></div>}
        </div>
      </section>
    </div>
  );
}
