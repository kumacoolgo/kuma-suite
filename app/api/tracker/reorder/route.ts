import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const { id, direction } = await req.json();
  if (!id || !['up', 'down'].includes(direction)) return NextResponse.json({ error: 'bad request' }, { status: 400 });

  const { rows } = await dbQuery('SELECT id, sort_order FROM tracker_tasks ORDER BY sort_order ASC, created_at ASC');
  const idx = rows.findIndex((row: any) => String(row.id) === String(id));
  if (idx < 0) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const nextIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (nextIdx < 0 || nextIdx >= rows.length) return NextResponse.json({ ok: true });
  const a = rows[idx];
  const b = rows[nextIdx];
  await dbQuery('UPDATE tracker_tasks SET sort_order = $1 WHERE id = $2', [b.sort_order, a.id]);
  await dbQuery('UPDATE tracker_tasks SET sort_order = $1 WHERE id = $2', [a.sort_order, b.id]);
  return NextResponse.json({ ok: true });
}
