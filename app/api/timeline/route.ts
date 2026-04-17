import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbQuery, dbTransaction } from '@/lib/db';
import { normalizeTimelineItem, sanitizeTimelineRow } from '@/lib/timeline-normalize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await dbQuery('SELECT * FROM timeline_items ORDER BY sort_order ASC, created_at ASC');
  return NextResponse.json({ items: rows.map(sanitizeTimelineRow) });
}

export async function POST(req: Request) {
  const rawBody = await req.json();
  const norm = normalizeTimelineItem({ id: rawBody.id, ...rawBody }, true);
  if (!norm.name || !norm.start_date || !norm.type) return NextResponse.json({ error: 'missing required fields' }, { status: 400 });

  const item = await dbTransaction(async (client) => {
    await client.query('LOCK TABLE timeline_items IN SHARE ROW EXCLUSIVE MODE');
    const { rows: maxRows } = await client.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM timeline_items');
    const sortOrder = Number(maxRows[0]?.max ?? 0) + 1;
    const id = (norm as any).id || nanoid();
    const { rows } = await client.query(
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
        id, norm.type, norm.name, norm.number, norm.start_date, norm.currency, norm.category,
        JSON.stringify(norm.tags), norm.billing_day, norm.cycle, norm.fiscal_month,
        JSON.stringify(norm.price_phases), JSON.stringify(norm.cancel_windows), norm.warranty_months,
        norm.policy_term_years, norm.policy_term_months, norm.balance, norm.balance_from, sortOrder,
      ],
    );
    return rows[0];
  });

  return NextResponse.json({ item: sanitizeTimelineRow(item) });
}
