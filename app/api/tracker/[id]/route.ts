import { NextResponse } from 'next/server';
import { dbQuery, dbTransaction } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withErrorHandler(async (req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json();
  const cols = ['test_name','publisher','start_date','end_date','test_case','test_result','gamepack','work_time','income1','received_date1','payment','income2','received_date2'];
  const sets = cols.map((k, i) => `${k} = $${i + 1}`);
  const values = cols.map((k) => body[k] ?? null);
  const { rows } = await dbQuery(
    `UPDATE tracker_tasks SET ${sets.join(', ')}, updated_at = now() WHERE id = $${cols.length + 1} RETURNING *`,
    [...values, id],
  );
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: rows[0] });
});

export const DELETE = withErrorHandler(async (_req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  await dbTransaction(async (client) => {
    await client.query('DELETE FROM tracker_tasks WHERE id = $1', [id]);
    await client.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS rn
        FROM tracker_tasks
      )
      UPDATE tracker_tasks AS t
      SET sort_order = ordered.rn
      FROM ordered
      WHERE t.id = ordered.id
    `);
  });
  return NextResponse.json({ ok: true });
});
