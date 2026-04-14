import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { nanoid } from 'nanoid';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  const raw = await file.text();
  const data = JSON.parse(raw);
  const items = Array.isArray(data) ? data : data.items;
  if (!Array.isArray(items)) return NextResponse.json({ error: 'invalid file' }, { status: 400 });

  await dbQuery('TRUNCATE timeline_items');
  let sortOrder = 1;
  let imported = 0;
  for (const item of items) {
    const id = String(item.id || nanoid());
    await dbQuery(
      `INSERT INTO timeline_items
       (id, type, name, number, start_date, currency, category, tags, billing_day, cycle, fiscal_month, price_phases, cancel_windows, warranty_months, policy_term_years, policy_term_months, balance, balance_from, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18,$19)`,
      [
        id, item.type, item.name, item.number ?? null, item.start_date, item.currency || 'CNY', item.category ?? null,
        JSON.stringify(item.tags || []), item.billing_day ?? null, item.cycle || 'monthly', item.fiscal_month ?? null,
        JSON.stringify(item.price_phases || []), JSON.stringify(item.cancel_windows || []), item.warranty_months ?? null,
        item.policy_term_years ?? null, item.policy_term_months ?? null, item.balance ?? null, item.balance_from ?? null, sortOrder++,
      ],
    );
    imported += 1;
  }
  return NextResponse.json({ imported });
}
