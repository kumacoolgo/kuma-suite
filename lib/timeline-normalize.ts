export function normalizeTimelineItem(raw: any, includeId = false) {
  const startDate = raw.start_date ?? raw.startDate;
  const billingDay = raw.billing_day ?? raw.billingDay;
  const fiscalMonth = raw.fiscal_month ?? raw.fiscalMonth;
  const pricePhases = raw.price_phases ?? raw.pricePhases;
  const cancelWindows = raw.cancel_windows ?? raw.cancelWindows;
  const warrantyMonths = raw.warranty_months ?? raw.warrantyMonths;
  const policyTermYears = raw.policy_term_years ?? raw.policyTermYears;
  const policyTermMonths = raw.policy_term_months ?? raw.policyTermMonths;
  const balanceFrom = raw.balance_from ?? raw.balanceFrom;
  const base = {
    type: raw.type,
    name: String(raw.name ?? '').trim(),
    number: raw.number ?? null,
    start_date: String(startDate ?? '').slice(0, 10),
    currency: String(raw.currency ?? 'CNY').toUpperCase(),
    category: raw.category ?? null,
    tags: Array.isArray(raw.tags) ? raw.tags.map(String) : [],
    billing_day: billingDay == null || billingDay === '' ? null : Number(billingDay),
    cycle: raw.cycle === 'yearly' ? 'yearly' : ('monthly' as const),
    fiscal_month: fiscalMonth == null || fiscalMonth === '' ? null : Number(fiscalMonth),
    price_phases: Array.isArray(pricePhases) ? pricePhases : [],
    cancel_windows: Array.isArray(cancelWindows) ? cancelWindows : [],
    warranty_months: warrantyMonths == null || warrantyMonths === '' ? null : Number(warrantyMonths),
    policy_term_years: policyTermYears == null || policyTermYears === '' ? null : Number(policyTermYears),
    policy_term_months: policyTermMonths == null || policyTermMonths === '' ? null : Number(policyTermMonths),
    balance: raw.balance == null || raw.balance === '' ? null : Number(raw.balance),
    balance_from: balanceFrom == null || balanceFrom === '' ? null : Number(balanceFrom),
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
