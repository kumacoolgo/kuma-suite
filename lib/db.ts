import { Pool, type PoolClient } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __kumaPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __kumaSchemaReady: Promise<void> | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  return new Pool({
    connectionString,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
}

export function pool(): Pool {
  if (!global.__kumaPool) global.__kumaPool = createPool();
  return global.__kumaPool;
}

async function initSchema(client: PoolClient) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS app_profile (
      id integer PRIMARY KEY DEFAULT 1,
      name text NOT NULL DEFAULT 'Kuma',
      bio text NOT NULL DEFAULT '',
      avatar_url text,
      background_url text,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_links (
      id text PRIMARY KEY,
      title text NOT NULL DEFAULT '',
      url text NOT NULL DEFAULT '',
      icon text,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS app_assets (
      id text PRIMARY KEY,
      filename text NOT NULL,
      mime_type text NOT NULL,
      data bytea NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS tracker_tasks (
      id serial PRIMARY KEY,
      test_name text NOT NULL,
      publisher text,
      start_date text,
      end_date text,
      test_case text,
      test_result text,
      gamepack text,
      work_time text,
      income1 text,
      received_date1 text,
      payment text,
      income2 text,
      received_date2 text,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS timeline_items (
      id text PRIMARY KEY,
      type text NOT NULL CHECK (type IN ('plan','warranty','insurance')),
      name text NOT NULL,
      number text,
      start_date text NOT NULL,
      currency text NOT NULL DEFAULT 'CNY',
      category text,
      tags jsonb NOT NULL DEFAULT '[]'::jsonb,
      billing_day integer,
      cycle text NOT NULL DEFAULT 'monthly',
      fiscal_month integer,
      price_phases jsonb NOT NULL DEFAULT '[]'::jsonb,
      cancel_windows jsonb NOT NULL DEFAULT '[]'::jsonb,
      warranty_months integer,
      policy_term_years integer,
      policy_term_months integer,
      balance numeric,
      balance_from integer,
      sort_order integer NOT NULL DEFAULT 0,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS board_documents (
      id integer PRIMARY KEY DEFAULT 1,
      content text NOT NULL DEFAULT '',
      font_size_px integer NOT NULL DEFAULT 18,
      updated_at timestamptz NOT NULL DEFAULT now()
    );

    CREATE TABLE IF NOT EXISTS vault_items (
      id text PRIMARY KEY,
      category text,
      url text NOT NULL,
      username text,
      password text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now(),
      valid_days integer,
      due_date text,
      updated_at timestamptz NOT NULL DEFAULT now()
    );
  `);

  await client.query(`INSERT INTO app_profile (id, name, bio) VALUES (1, 'Kuma', '') ON CONFLICT (id) DO NOTHING;`);
  await client.query(`INSERT INTO board_documents (id, content, font_size_px) VALUES (1, '', 18) ON CONFLICT (id) DO NOTHING;`);
}

export async function ensureSchema() {
  if (!global.__kumaSchemaReady) {
    global.__kumaSchemaReady = (async () => {
      const client = await pool().connect();
      try {
        await initSchema(client);
      } finally {
        client.release();
      }
    })();
  }
  return global.__kumaSchemaReady;
}

export async function dbQuery(text: string, values: any[] = []) {
  await ensureSchema();
  return pool().query(text, values);
}
