import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbTransaction } from '@/lib/db';
import { normalizeTimelineItem } from '@/lib/timeline-normalize';
import { withErrorHandler } from '@/lib/api-handler';
import { parseCsv, parseJsonCell } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = withErrorHandler(async (req: Request) => {
  const form = await req.formData();
  const file = form.get('file');
  const confirm = form.get('confirm');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (confirm !== 'REPLACE_TIMELINE_ITEMS') return NextResponse.json({ error: 'confirmation required' }, { status: 400 });
  if (file.size > MAX_IMPORT_SIZE) return NextResponse.json({ error: 'file too large (max 5 MB)' }, { status: 413 });
  const items = parseCsv(await file.text());
  const normalized = items.map((item) => ({
    ...normalizeTimelineItem(item, true),
    id: String(item.id || nanoid()),
    tags: parseJsonCell(item.tags, []),
    price_phases: parseJsonCell(item.pricePhases || item.price_phases, []),
    cancel_windows: parseJsonCell(item.cancelWindows || item.cancel_windows, []),
  }));
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
});
