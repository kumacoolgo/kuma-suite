import { NextResponse } from 'next/server';
import { dbTransaction } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { id, direction } = await req.json();
  if (!id || !['up', 'down'].includes(direction)) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const result = await dbTransaction(async (client) => {
    const { rows } = await client.query('SELECT id, sort_order FROM tracker_tasks ORDER BY sort_order ASC, created_at ASC FOR UPDATE');
    const idx = rows.findIndex((row: any) => String(row.id) === String(id));
    if (idx < 0) return { status: 404 as const, body: { error: 'not found' } };
    const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (nextIdx < 0 || nextIdx >= rows.length) return { status: 200 as const, body: { ok: true } };
    const a = rows[idx];
    const b = rows[nextIdx];
    await client.query('UPDATE tracker_tasks SET sort_order = $1 WHERE id = $2', [b.sort_order, a.id]);
    await client.query('UPDATE tracker_tasks SET sort_order = $1 WHERE id = $2', [a.sort_order, b.id]);
    return { status: 200 as const, body: { ok: true } };
  });

  return NextResponse.json(result.body, { status: result.status });
}
