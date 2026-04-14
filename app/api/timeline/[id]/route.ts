import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalize(raw: any) {
  return {
    type: raw.type,
    name: String(raw.name ?? '').trim(),
    number: raw.number ?? null,
    start_date: String(raw.start_date ?? '').slice(0, 10),
    currency: String(raw.currency ?? 'CNY').toUpperCase(),
    category: raw.category ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    billing_day: raw.billing_day == null || raw.billing_day === '' ? null : Number(raw.billing_day),
    cycle: raw.cycle === 'yearly' ? 'yearly' : 'monthly',
    fiscal_month: raw.fiscal_month == null || raw.fiscal_month === '' ? null : Number(raw.fiscal_month),
    price_phases: Array.isArray(raw.price_phases) ? raw.price_phases : [],
    cancel_windows: Array.isArray(raw.cancel_windows) ? raw.cancel_windows : [],
    warranty_months: raw.warranty_months == null || raw.warranty_months === '' ? null : Number(raw.warranty_months),
    policy_term_years: raw.policy_term_years == null || raw.policy_term_years === '' ? null : Number(raw.policy_term_years),
    policy_term_months: raw.policy_term_months == null || raw.policy_term_months === '' ? null : Number(raw.policy_term_months),
    balance: raw.balance == null || raw.balance === '' ? null : Number(raw.balance),
    balance_from: raw.balance_from == null || raw.balance_from === '' ? null : Number(raw.balance_from),
  };
}

export async function PUT(req: Request, ctx: any) {
  const { id } = await Promise.resolve(ctx.params);
  const body = normalize(await req.json());
  if (!body.name || !body.start_date || !body.type) return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
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
    [body.type, body.name, body.number, body.start_date, body.currency, body.category, JSON.stringify(body.tags), body.billing_day, body.cycle, body.fiscal_month, JSON.stringify(body.price_phases), JSON.stringify(body.cancel_windows), body.warranty_months, body.policy_term_years, body.policy_term_months, body.balance, body.balance_from, id],
  );
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json({ item: { ...rows[0], tags: rows[0].tags || [], price_phases: rows[0].price_phases || [], cancel_windows: rows[0].cancel_windows || [] } });
}

export async function DELETE(_req: Request, ctx: any) {
  const { id } = await Promise.resolve(ctx.params);
  await dbQuery('DELETE FROM timeline_items WHERE id = $1', [id]);
  await dbQuery(`
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS rn
      FROM timeline_items
    )
    UPDATE timeline_items AS t
    SET sort_order = ordered.rn
    FROM ordered
    WHERE t.id = ordered.id
  `);
  return NextResponse.json({ ok: true });
}
