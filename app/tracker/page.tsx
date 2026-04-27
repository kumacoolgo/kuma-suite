'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { apiJson } from '@/lib/client';
import type { GameTask } from '@/lib/types';

// ─── Types ───────────────────────────────────────────────────────────────────

type FormData = {
  test_name: string;
  publisher: string;
  start_date: string;
  end_date: string;
  test_case: string;
  test_result: string;
  gamepack: string;
  work_time: string;
  income1: string;
  received_date1: string;
  payment: string;
  income2: string;
  received_date2: string;
};

const EMPTY_FORM: FormData = {
  test_name: '',
  publisher: '',
  start_date: '',
  end_date: '',
  test_case: '',
  test_result: '',
  gamepack: '',
  work_time: '',
  income1: '',
  received_date1: '',
  payment: '',
  income2: '',
  received_date2: '',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function isUrl(s: string | null) {
  return !!s && (s.startsWith('http://') || s.startsWith('https://'));
}

// ─── Detail Row ──────────────────────────────────────────────────────────────

function DetailPanel({ task }: { task: GameTask }) {
  const items: [string, string | null][] = [
    ['Test Case', task.test_case],
    ['Test Result', task.test_result],
    ['Gamepack', task.gamepack],
  ];
  return (
    <div style={{
      background: 'var(--tracker-detail-bg)',
      padding: '15px 30px',
      borderTop: '1px solid var(--tracker-line)',
    }}>
      {items.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', gap: 30, padding: '6px 0' }}>
          <div style={{ width: 180, color: 'var(--tracker-accent)', flexShrink: 0, fontSize: '1.3125rem' }}>{label}</div>
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {isUrl(value)
              ? <a href={value!} target="_blank" rel="noopener noreferrer"
                  style={{ color: 'var(--tracker-accent)', textDecoration: 'none', fontSize: '1.3125rem' }}>{value}</a>
              : <span style={{ color: 'var(--tracker-value)', fontSize: '1.3125rem' }}>{value || ''}</span>
            }
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Edit Modal ──────────────────────────────────────────────────────────────

function EditModal({
  task,
  onClose,
  onSave,
  status,
}: {
  task: GameTask | null;
  onClose: () => void;
  onSave: (form: FormData) => Promise<void>;
  status: string;
}) {
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const firstRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(task ? {
      test_name: task.test_name ?? '',
      publisher: task.publisher ?? '',
      start_date: task.start_date ?? '',
      end_date: task.end_date ?? '',
      test_case: task.test_case ?? '',
      test_result: task.test_result ?? '',
      gamepack: task.gamepack ?? '',
      work_time: task.work_time ?? '',
      income1: task.income1 ?? '',
      received_date1: task.received_date1 ?? '',
      payment: task.payment ?? '',
      income2: task.income2 ?? '',
      received_date2: task.received_date2 ?? '',
    } : EMPTY_FORM);
    setTimeout(() => firstRef.current?.focus(), 50);
  }, [task]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  function set(field: keyof FormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await onSave(form);
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    border: '1px solid var(--tracker-line)',
    color: 'var(--tracker-text)',
    borderRadius: 9,
    padding: '10px 12px',
    fontSize: '1rem',
    width: '100%',
  };
  const labelStyle: React.CSSProperties = {
    color: 'var(--tracker-muted)',
    fontSize: '0.95rem',
    fontWeight: 600,
    marginBottom: 6,
  };
  const groupStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
  };

  return (
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(2, 8, 23, 0.62)',
        zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
      }}
    >
      <div style={{
        background: 'var(--tracker-surface)', border: '1px solid var(--tracker-line)', borderRadius: 18,
        padding: 22, width: 'min(1180px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 32px)', overflow: 'auto',
      }}>
        <h2 style={{ marginBottom: 16, fontSize: '1.35rem', color: 'var(--tracker-accent)' }}>
          {task ? '编辑记录' : '新建记录'}
        </h2>

        <form onSubmit={handleSubmit}>
          {/* Row 1: test_name + publisher */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
            <div style={{ ...groupStyle, flex: 2 }}>
              <label style={labelStyle}>测试名称 *</label>
              <input ref={firstRef} style={inputStyle} value={form.test_name} onChange={set('test_name')} required />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>发行商</label>
              <input style={inputStyle} value={form.publisher} onChange={set('publisher')} />
            </div>
          </div>

          {/* Row 2: start_date + end_date */}
          <div style={{ display: 'flex', gap: 14, marginBottom: 12 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>开始日期</label>
              <input type="date" style={inputStyle} value={form.start_date} onChange={set('start_date')} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>结束日期</label>
              <input type="date" style={inputStyle} value={form.end_date} onChange={set('end_date')} />
            </div>
          </div>

          {/* Row 3: work_time + income1 + received_date1 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 12 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>工时</label>
              <input style={inputStyle} value={form.work_time} onChange={set('work_time')} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>收入1</label>
              <input style={inputStyle} value={form.income1} onChange={set('income1')} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>收款日1</label>
              <input type="date" style={inputStyle} value={form.received_date1} onChange={set('received_date1')} />
            </div>
          </div>

          {/* Row 4: payment + income2 + received_date2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14, marginBottom: 12 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>支付</label>
              <input style={inputStyle} value={form.payment} onChange={set('payment')} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>收入2</label>
              <input style={inputStyle} value={form.income2} onChange={set('income2')} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>收款日2</label>
              <input type="date" style={inputStyle} value={form.received_date2} onChange={set('received_date2')} />
            </div>
          </div>

          {/* Row 5: test_case + test_result */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 14, marginBottom: 12 }}>
            <div style={groupStyle}>
              <label style={labelStyle}>Test Case</label>
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 92 }}
                value={form.test_case} onChange={set('test_case')} />
            </div>
            <div style={groupStyle}>
              <label style={labelStyle}>Test Result</label>
              <textarea style={{ ...inputStyle, resize: 'none', minHeight: 92 }}
                value={form.test_result} onChange={set('test_result')} />
            </div>
          </div>

          {/* Row 6: gamepack */}
          <div style={{ marginBottom: 12 }}>
            <label style={labelStyle}>Gamepack</label>
            <input style={inputStyle} value={form.gamepack} onChange={set('gamepack')} />
          </div>

          {status && (
            <p style={{ fontSize: '0.95rem', color: '#dc3545', marginBottom: 10 }}>{status}</p>
          )}

          <div style={{ display: 'flex', gap: 12, marginTop: 14, justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose}
              style={{ padding: '10px 22px', border: '1px solid var(--tracker-line)', background: 'var(--button-bg)', color: 'var(--tracker-text)', borderRadius: 9, cursor: 'pointer', fontSize: '1rem' }}>
              取消
            </button>
            <button type="submit"
              style={{ padding: '10px 22px', border: '1px solid var(--primary-border)', background: 'var(--primary-bg)', color: 'var(--primary-text)', borderRadius: 9, cursor: 'pointer', fontSize: '1rem' }}>
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

const COLS = '60px 2fr 1fr 135px 135px 120px 90px 105px 135px 105px 105px 135px';

export default function TrackerPage() {
  const [tasks, setTasks] = useState<GameTask[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [modalTask, setModalTask] = useState<GameTask | null | undefined>(undefined); // undefined = closed
  const [status, setStatus] = useState('');
  const [statusErr, setStatusErr] = useState(false);
  const [modalStatus, setModalStatus] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const showStatus = useCallback((msg: string, isErr = false) => {
    setStatus(msg);
    setStatusErr(isErr);
    if (!isErr) setTimeout(() => setStatus(''), 3000);
  }, []);

  const loadTasks = useCallback(async () => {
    try {
      const data = await apiJson<{ items: GameTask[] }>('/api/tracker');
      setTasks(data.items ?? []);
      setSelectedId(null);
    } catch (e: unknown) {
      showStatus('加载失败: ' + (e instanceof Error ? e.message : String(e)), true);
    }
  }, [showStatus]);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const selectedIdx = tasks.findIndex(t => t.id === selectedId);

  async function handleSave(form: FormData) {
    setModalStatus('');
    if (!form.test_name.trim()) {
      setModalStatus('测试名称必填');
      return;
    }
    const payload = {
      test_name: form.test_name.trim(),
      publisher: form.publisher.trim() || null,
      start_date: form.start_date || null,
      end_date: form.end_date || null,
      test_case: form.test_case.trim() || null,
      test_result: form.test_result.trim() || null,
      gamepack: form.gamepack.trim() || null,
      work_time: form.work_time.trim() || null,
      income1: form.income1.trim() || null,
      received_date1: form.received_date1 || null,
      payment: form.payment.trim() || null,
      income2: form.income2.trim() || null,
      received_date2: form.received_date2 || null,
    };
    try {
      if (modalTask) {
        await apiJson(`/api/tracker/${modalTask.id}`, { method: 'PUT', body: JSON.stringify(payload) });
        showStatus('已更新');
      } else {
        await apiJson('/api/tracker', { method: 'POST', body: JSON.stringify(payload) });
        showStatus('已创建');
      }
      setModalTask(undefined);
      setModalStatus('');
      await loadTasks();
    } catch (e: unknown) {
      setModalStatus(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleDelete() {
    if (!selectedId) return;
    if (!confirm('删除这条记录？')) return;
    try {
      await apiJson(`/api/tracker/${selectedId}`, { method: 'DELETE' });
      setSelectedId(null);
      setExpandedId(null);
      await loadTasks();
      showStatus('已删除');
    } catch (e: unknown) {
      showStatus(e instanceof Error ? e.message : String(e), true);
    }
  }

  async function handleDeleteAll() {
    if (tasks.length === 0) return;
    if (!confirm(`确定删除全部 ${tasks.length} 条游戏测试记录？此操作不可恢复。`)) return;
    try {
      await apiJson('/api/tracker', { method: 'DELETE', body: JSON.stringify({ confirm: 'DELETE_ALL_TRACKER_TASKS' }) });
      setSelectedId(null);
      setExpandedId(null);
      await loadTasks();
      showStatus('已删除全部记录');
    } catch (e: unknown) {
      showStatus(e instanceof Error ? e.message : String(e), true);
    }
  }

  async function handleReorder(dir: 'up' | 'down') {
    if (!selectedId) return;
    try {
      await apiJson('/api/tracker/reorder', { method: 'POST', body: JSON.stringify({ id: selectedId, direction: dir }) });
      await loadTasks();
      // re-select after reload
      setSelectedId(selectedId);
      showStatus(dir === 'up' ? '已上移' : '已下移');
    } catch (e: unknown) {
      showStatus(e instanceof Error ? e.message : String(e), true);
    }
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/tracker/import', { method: 'POST', credentials: 'include', body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      const result = await res.json();
      showStatus(`导入成功: ${result.imported} 条`);
      await loadTasks();
    } catch (e: unknown) {
      showStatus('导入失败: ' + (e instanceof Error ? e.message : String(e)), true);
    }
    e.target.value = '';
  }

  const btnBase: React.CSSProperties = {
    padding: '12px 24px', border: '1px solid var(--tracker-line)', background: 'var(--button-bg)',
    color: 'var(--tracker-text)', borderRadius: 9, cursor: 'pointer', fontSize: '1.3125rem',
  };

  const headerCellStyle: React.CSSProperties = {
    padding: '15px 18px', fontSize: '1.2rem', color: 'var(--tracker-muted)',
    fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
    overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
  };

  return (
    <div className="page stack">
      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
        <button style={btnBase} onClick={() => { setModalTask(null); setModalStatus(''); }}>+ 新建</button>
        <button style={{ ...btnBase, opacity: selectedId === null ? 0.4 : 1, cursor: selectedId === null ? 'not-allowed' : 'pointer' }}
          disabled={selectedId === null}
          onClick={() => { const t = tasks.find(t => t.id === selectedId); if (t) { setModalTask(t); setModalStatus(''); } }}>
          编辑
        </button>
        <button style={{ ...btnBase, background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)', opacity: selectedId === null ? 0.4 : 1, cursor: selectedId === null ? 'not-allowed' : 'pointer' }}
          disabled={selectedId === null} onClick={handleDelete}>
          删除
        </button>
        <button style={{ ...btnBase, background: 'var(--danger-bg)', borderColor: 'var(--danger-border)', color: 'var(--danger-text)', opacity: tasks.length === 0 ? 0.4 : 1, cursor: tasks.length === 0 ? 'not-allowed' : 'pointer' }}
          disabled={tasks.length === 0} onClick={handleDeleteAll}>
          全部删除
        </button>
        <button style={{ ...btnBase, opacity: (selectedId === null || selectedIdx <= 0) ? 0.4 : 1, cursor: (selectedId === null || selectedIdx <= 0) ? 'not-allowed' : 'pointer' }}
          disabled={selectedId === null || selectedIdx <= 0} onClick={() => handleReorder('up')}>
          ↑ 上移
        </button>
        <button style={{ ...btnBase, opacity: (selectedId === null || selectedIdx >= tasks.length - 1) ? 0.4 : 1, cursor: (selectedId === null || selectedIdx >= tasks.length - 1) ? 'not-allowed' : 'pointer' }}
          disabled={selectedId === null || selectedIdx >= tasks.length - 1} onClick={() => handleReorder('down')}>
          ↓ 下移
        </button>
        <button style={btnBase} onClick={() => window.open('/api/tracker/export')}>导出</button>
        <button style={btnBase} onClick={() => fileRef.current?.click()}>导入</button>
        <input ref={fileRef} type="file" accept="text/csv,.csv" style={{ display: 'none' }} onChange={handleImport} />
      </div>

      {/* Status */}
      {status && (
        <p style={{ fontSize: '1.2rem', color: statusErr ? 'var(--danger-text)' : 'var(--tracker-muted)', marginBottom: 18 }}>{status}</p>
      )}

      {/* Grid */}
      <div style={{ border: '1px solid var(--tracker-line)', borderRadius: 12, overflowX: 'auto', background: 'var(--tracker-surface-2)' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: COLS, minWidth: 1350, background: 'var(--tracker-header)' }}>
          {['#', '测试名称', '发行商', '开始', '结束', 'Test Case', '工时', '收入1', '收款日1', '支付', '收入2', '收款日2'].map(h => (
            <div key={h} style={headerCellStyle}>{h}</div>
          ))}
        </div>

        {/* Rows */}
        {tasks.length === 0 ? (
          <div style={{ padding: 36, textAlign: 'center', color: 'var(--tracker-empty)', fontSize: '1.3125rem' }}>
            暂无记录 — 点击「新建」添加
          </div>
        ) : tasks.map((task, idx) => (
          <div key={task.id}>
            <div
              onClick={() => {
                setSelectedId(selectedId === task.id ? null : task.id);
                setExpandedId(null);
              }}
              style={{
                display: 'grid', gridTemplateColumns: COLS, minWidth: 1350,
                borderTop: '1px solid var(--tracker-line)', cursor: 'pointer',
                background: selectedId === task.id ? 'var(--tracker-selected)' : 'transparent',
                borderLeft: selectedId === task.id ? '3px solid var(--tracker-accent)' : '3px solid transparent',
                transition: 'background 0.1s',
              }}
            >
              {[
                String(idx + 1),
                task.test_name,
                task.publisher ?? '',
                task.start_date ?? '',
                task.end_date ?? '',
              ].map((val, ci) => (
                <div key={ci} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '1.3125rem' }}>
                  {val}
                </div>
              ))}

              {/* Test Case toggle */}
              <div
                onClick={(e) => { e.stopPropagation(); setExpandedId(expandedId === task.id ? null : task.id); }}
                style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--tracker-accent)', cursor: 'pointer', fontSize: '1.3125rem' }}
              >
                Detail
              </div>

              {[
                task.work_time ?? '',
                task.income1 ?? '',
                task.received_date1 ?? '',
                task.payment ?? '',
                task.income2 ?? '',
                task.received_date2 ?? '',
              ].map((val, ci) => (
                <div key={ci} style={{ padding: '15px 18px', display: 'flex', alignItems: 'center', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis', fontSize: '1.3125rem' }}>
                  {val}
                </div>
              ))}
            </div>

            {expandedId === task.id && <DetailPanel task={task} />}
          </div>
        ))}
      </div>

      {/* Modal */}
      {modalTask !== undefined && (
        <EditModal
          task={modalTask}
          onClose={() => { setModalTask(undefined); setModalStatus(''); }}
          onSave={handleSave}
          status={modalStatus}
        />
      )}
    </div>
  );
}
