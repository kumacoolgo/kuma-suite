import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbQuery } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/vault-crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await dbQuery('SELECT * FROM vault_items ORDER BY created_at DESC');
  return NextResponse.json({ items: rows.map((row: any) => ({ ...row, password: decryptSecret(row.password) })) });
}

export async function POST(req: Request) {
  const body = await req.json();
  if (!String(body.url ?? '').trim()) return NextResponse.json({ error: 'url required' }, { status: 400 });
  const id = nanoid();
  const password = String(body.password ?? '');
  const { rows } = await dbQuery(
    `INSERT INTO vault_items (id, category, url, username, password, created_at, valid_days, due_date)
     VALUES ($1,$2,$3,$4,$5, COALESCE($6::timestamptz, now()), $7, $8)
     RETURNING *`,
    [
      id,
      body.category ? String(body.category).trim() : null,
      String(body.url).trim(),
      body.username ? String(body.username).trim() : null,
      encryptSecret(password),
      body.created_at || null,
      body.valid_days == null || body.valid_days === '' ? null : Number(body.valid_days),
      body.due_date ? String(body.due_date) : null,
    ],
  );
  const item = rows[0];
  return NextResponse.json({ item: { ...item, password } });
}
