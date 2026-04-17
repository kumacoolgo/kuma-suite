import { NextResponse } from 'next/server';
import { dbQuery, dbTransaction } from '@/lib/db';
import { normalizeTimelineItem, sanitizeTimelineRow } from '@/lib/timeline-normalize';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withErrorHandler(async (req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  const norm = normalizeTimelineItem(await req.json());
  if (!norm.name || !norm.start_date || !norm.type) return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  const { rows } = await dbQuery(
    `UPDATE timeline_items SET
       type = $1,
       name = $2,
       number = $3,
       start_date = $4,
       currency = $5,
       category = $6,
       tags = $7::jsonb,
       billing_day = $8,
       cycle = $9,
       fiscal_month = $10,
       price_phases = $11::jsonb,
       cancel_windows = $12::jsonb,
       warranty_months = $13,
       policy_term_years = $14,
       policy_term_months = $15,
       balance = $16,
       balance_from = $17,
       updated_at = now()
     WHERE id = $18
     RETURNING *`,
    [norm.type, norm.name, norm.number, norm.start_date, norm.currency, norm.category, JSON.stringify(norm.tags), norm.billing_day, norm.cycle, norm.fiscal_month, JSON.stringify(norm.price_phases), JSON.stringify(norm.cancel_windows), norm.warranty_months, norm.policy_term_years, norm.policy_term_months, norm.balance, norm.balance_from, id],
  );
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: sanitizeTimelineRow(rows[0]) });
});

export const DELETE = withErrorHandler(async (_req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  await dbTransaction(async (client) => {
    await client.query('DELETE FROM timeline_items WHERE id = $1', [id]);
    await client.query(`
      WITH ordered AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS rn
        FROM timeline_items
      )
      UPDATE timeline_items AS t
      SET sort_order = ordered.rn
      FROM ordered
      WHERE t.id = ordered.id
    `);
  });
  return NextResponse.json({ ok: true });
});
