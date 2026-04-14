import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalize(raw: any) {
  return {
    id: raw.id,
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

export async function GET() {
  const { rows } = await dbQuery('SELECT * FROM timeline_items ORDER BY sort_order ASC, created_at ASC');
  return NextResponse.json({ items: rows.map((row: any) => ({ ...row, tags: row.tags || [], price_phases: row.price_phases || [], cancel_windows: row.cancel_windows || [] })) });
}

export async function POST(req: Request) {
  const body = normalize(await req.json());
  if (!body.name || !body.start_date || !body.type) return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  const { rows: maxRows } = await dbQuery('SELECT COALESCE(MAX(sort_order), 0) AS max FROM timeline_items');
  const sortOrder = Number(maxRows[0]?.max ?? 0) + 1;
  const id = body.id || nanoid();
  const { rows } = await dbQuery(
    `INSERT INTO timeline_items
     (id, type, name, number, start_date, currency, category, tags, billing_day, cycle, fiscal_month, price_phases, cancel_windows, warranty_months, policy_term_years, policy_term_months, balance, balance_from, sort_order)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18,$19)
     ON CONFLICT (id) DO UPDATE SET
       type = EXCLUDED.type,
       name = EXCLUDED.name,
       number = EXCLUDED.number,
       start_date = EXCLUDED.start_date,
       currency = EXCLUDED.currency,
       category = EXCLUDED.category,
       tags = EXCLUDED.tags,
       billing_day = EXCLUDED.billing_day,
       cycle = EXCLUDED.cycle,
       fiscal_month = EXCLUDED.fiscal_month,
       price_phases = EXCLUDED.price_phases,
       cancel_windows = EXCLUDED.cancel_windows,
       warranty_months = EXCLUDED.warranty_months,
       policy_term_years = EXCLUDED.policy_term_years,
       policy_term_months = EXCLUDED.policy_term_months,
       balance = EXCLUDED.balance,
       balance_from = EXCLUDED.balance_from,
       updated_at = now()
     RETURNING *`,
    [
      id, body.type, body.name, body.number, body.start_date, body.currency, body.category,
      JSON.stringify(body.tags), body.billing_day, body.cycle, body.fiscal_month,
      JSON.stringify(body.price_phases), JSON.stringify(body.cancel_windows), body.warranty_months,
      body.policy_term_years, body.policy_term_months, body.balance, body.balance_from, sortOrder,
    ],
  );
  return NextResponse.json({ item: { ...rows[0], tags: rows[0].tags || [], price_phases: rows[0].price_phases || [], cancel_windows: rows[0].cancel_windows || [] } });
}
