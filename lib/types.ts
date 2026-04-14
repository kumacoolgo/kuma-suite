export type BlogProfile = {
  id: number;
  name: string;
  bio: string;
  avatar_url: string | null;
  background_url: string | null;
};

export type BlogLink = {
  id: string;
  title: string;
  url: string;
  icon: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BlogSummary = {
  profile: BlogProfile;
  links: BlogLink[];
};

export type AssetRecord = {
  id: string;
  filename: string;
  mime_type: string;
  data: Buffer;
  created_at: string;
};

export type GameTask = {
  id: number;
  test_name: string;
  publisher: string | null;
  start_date: string | null;
  end_date: string | null;
  test_case: string | null;
  test_result: string | null;
  gamepack: string | null;
  work_time: string | null;
  income1: string | null;
  received_date1: string | null;
  payment: string | null;
  income2: string | null;
  received_date2: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type TimelineItem = {
  id: string;
  type: 'plan' | 'warranty' | 'insurance';
  name: string;
  number: string | null;
  start_date: string;
  currency: string;
  category: string | null;
  tags: string[];
  billing_day: number | null;
  cycle: 'monthly' | 'yearly';
  fiscal_month: number | null;
  price_phases: Array<{ fromMonth: number; amount: number }>;
  cancel_windows: Array<{ fromMonth: number; toMonth: number }>;
  warranty_months: number | null;
  policy_term_years: number | null;
  policy_term_months: number | null;
  balance: number | null;
  balance_from: number | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type BoardDocument = {
  content: string;
  font_size_px: number;
  updated_at: string | null;
};

export type VaultItem = {
  id: string;
  category: string | null;
  url: string;
  username: string | null;
  password: string;
  created_at: string;
  valid_days: number | null;
  due_date: string | null;
};
