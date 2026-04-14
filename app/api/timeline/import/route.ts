import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbQuery, dbTransaction } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function normalizeItem(item: any) {
  return {
    id: String(item.id || nanoid()),
    type: String(item.type || '').trim(),
    name: String(item.name || '').trim(),
    number: item.number ?? null,
    start_date: String(item.start_date || '').slice(0, 10),
    currency: String(item.currency || 'CNY').trim() || 'CNY',
    category: item.category ?? null,
    tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
    billing_day: item.billing_day ?? null,
    cycle: item.cycle || 'monthly',
    fiscal_month: item.fiscal_month ?? null,
    price_phases: Array.isArray(item.price_phases) ? item.price_phases : [],
    cancel_windows: Array.isArray(item.cancel_windows) ? item.cancel_windows : [],
    warranty_months: item.warranty_months ?? null,
    policy_term_years: item.policy_term_years ?? null,
    policy_term_months: item.policy_term_months ?? null,
    balance: item.balance ?? null,
    balance_from: item.balance_from ?? null,
  };
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });

  let items: any[];
  try {
    const raw = await file.text();
    const data = JSON.parse(raw);
    items = Array.isArray(data) ? data : data.items;
  } catch {
    return NextResponse.json({ error: 'invalid file' }, { status: 400 });
  }
  if (!Array.isArray(items)) return NextResponse.json({ error: 'invalid file' }, { status: 400 });

  const normalized = items.map(normalizeItem);
  if (normalized.some((item) => !item.type || !item.name || !item.start_date)) {
    return NextResponse.json({ error: 'missing required fields' }, { status: 400 });
  }

  const imported = await dbTransaction(async (client) => {
    await client.query('TRUNCATE timeline_items');
    let sortOrder = 1;
    for (const item of normalized) {
      await client.query(
        `INSERT INTO timeline_items
         (id, type, name, number, start_date, currency, category, tags, billing_day, cycle, fiscal_month, price_phases, cancel_windows, warranty_months, policy_term_years, policy_term_months, balance, balance_from, sort_order)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11,$12::jsonb,$13::jsonb,$14,$15,$16,$17,$18,$19)`,
        [
          item.id,
          item.type,
          item.name,
          item.number,
          item.start_date,
          item.currency,
          item.category,
          JSON.stringify(item.tags),
          item.billing_day,
          item.cycle,
          item.fiscal_month,
          JSON.stringify(item.price_phases),
          JSON.stringify(item.cancel_windows),
          item.warranty_months,
          item.policy_term_years,
          item.policy_term_months,
          item.balance,
          item.balance_from,
          sortOrder++,
        ],
      );
    }
    return normalized.length;
  });

  return NextResponse.json({ imported });
}
