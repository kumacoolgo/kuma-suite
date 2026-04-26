import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { sanitizeTimelineRow } from '@/lib/timeline-normalize';
import { withErrorHandler } from '@/lib/api-handler';
import { toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function toTimeline2Item(row: any) {
  const item = sanitizeTimelineRow(row);
  return {
    id: item.id,
    type: item.type,
    name: item.name,
    number: item.number ?? '',
    startDate: item.start_date,
    currency: item.currency,
    category: item.category ?? '',
    tags: item.tags ?? [],
    billingDay: item.billing_day ?? 1,
    cycle: item.cycle,
    fiscalMonth: item.fiscal_month ?? undefined,
    pricePhases: item.price_phases ?? [],
    cancelWindows: item.cancel_windows ?? [],
    warrantyMonths: item.warranty_months ?? undefined,
    policyTermYears: item.policy_term_years ?? 0,
    policyTermMonths: item.policy_term_months ?? 0,
    balance: item.balance ?? undefined,
    balanceFrom: item.balance_from ?? undefined,
    order: item.sort_order ?? undefined,
  };
}

export const GET = withErrorHandler(async () => {
  const { rows } = await dbQuery('SELECT * FROM timeline_items ORDER BY sort_order ASC, created_at ASC');
  const items = rows.map(toTimeline2Item).map((item) => ({
    ...item,
    tags: JSON.stringify(item.tags ?? []),
    pricePhases: JSON.stringify(item.pricePhases ?? []),
    cancelWindows: JSON.stringify(item.cancelWindows ?? []),
  }));
  const columns = [
    'id',
    'type',
    'name',
    'number',
    'startDate',
    'currency',
    'category',
    'tags',
    'billingDay',
    'cycle',
    'fiscalMonth',
    'pricePhases',
    'cancelWindows',
    'warrantyMonths',
    'policyTermYears',
    'policyTermMonths',
    'balance',
    'balanceFrom',
    'order',
  ].map((key) => ({ key, label: key }));
  const payload = toCsv(items, columns);
  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="timeline.csv"',
    },
  });
});
