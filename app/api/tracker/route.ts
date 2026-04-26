import { NextResponse } from 'next/server';
import { dbQuery, dbTransaction } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const { rows } = await dbQuery('SELECT * FROM tracker_tasks ORDER BY sort_order ASC, created_at ASC');
  return NextResponse.json({ items: rows });
});

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json();
  if (!String(body.test_name || '').trim()) return NextResponse.json({ error: 'test_name required' }, { status: 400 });
  const item = await dbTransaction(async (client) => {
    await client.query('LOCK TABLE tracker_tasks IN SHARE ROW EXCLUSIVE MODE');
    const { rows: maxRows } = await client.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM tracker_tasks');
    const nextSort = Number(maxRows[0]?.max ?? 0) + 1;
    const cols = ['test_name','publisher','start_date','end_date','test_case','test_result','gamepack','work_time','income1','received_date1','payment','income2','received_date2'];
    const vals = cols.map((k) => body[k] ?? null);
    const { rows } = await client.query(
      `INSERT INTO tracker_tasks (${cols.join(', ')}, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
       RETURNING *`,
      [...vals, nextSort],
    );
    return rows[0];
  });
  return NextResponse.json({ item });
});

export const DELETE = withErrorHandler(async () => {
  await dbQuery('DELETE FROM tracker_tasks');
  return NextResponse.json({ ok: true });
});
