import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await dbQuery('SELECT * FROM tracker_tasks ORDER BY sort_order ASC, created_at ASC');
  return NextResponse.json({ items: rows });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!String(body.test_name || '').trim()) return NextResponse.json({ error: 'test_name required' }, { status: 400 });
  const { rows: maxRows } = await dbQuery('SELECT COALESCE(MAX(sort_order), 0) AS max FROM tracker_tasks');
  const nextSort = Number(maxRows[0]?.max ?? 0) + 1;
  const cols = ['test_name','publisher','start_date','end_date','test_case','test_result','gamepack','work_time','income1','received_date1','payment','income2','received_date2'];
  const vals = cols.map((k) => body[k] ?? null);
  const { rows } = await dbQuery(
    `INSERT INTO tracker_tasks (${cols.join(', ')}, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
     RETURNING *`,
    [...vals, nextSort],
  );
  return NextResponse.json({ item: rows[0] });
}
