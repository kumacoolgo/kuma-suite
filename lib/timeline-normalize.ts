export function normalizeTimelineItem(raw: any, includeId = false) {
  const base = {
    type: raw.type,
    name: String(raw.name ?? '').trim(),
    number: raw.number ?? null,
    start_date: String(raw.start_date ?? '').slice(0, 10),
    currency: String(raw.currency ?? 'CNY').toUpperCase(),
    category: raw.category ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    billing_day: raw.billing_day == null || raw.billing_day === '' ? null : Number(raw.billing_day),
    cycle: raw.cycle === 'yearly' ? 'yearly' : ('monthly' as const),
    fiscal_month: raw.fiscal_month == null || raw.fiscal_month === '' ? null : Number(raw.fiscal_month),
    price_phases: Array.isArray(raw.price_phases) ? raw.price_phases : [],
    cancel_windows: Array.isArray(raw.cancel_windows) ? raw.cancel_windows : [],
    warranty_months: raw.warranty_months == null || raw.warranty_months === '' ? null : Number(raw.warranty_months),
    policy_term_years: raw.policy_term_years == null || raw.policy_term_years === '' ? null : Number(raw.policy_term_years),
    policy_term_months: raw.policy_term_months == null || raw.policy_term_months === '' ? null : Number(raw.policy_term_months),
    balance: raw.balance == null || raw.balance === '' ? null : Number(raw.balance),
    balance_from: raw.balance_from == null || raw.balance_from === '' ? null : Number(raw.balance_from),
  };
  return includeId ? { id: raw.id, ...base } : base;
}

export function sanitizeTimelineRow(row: any) {
  return {
    ...row,
    tags: row.tags || [],
    price_phases: row.price_phases || [],
    cancel_windows: row.cancel_windows || [],
  };
}
