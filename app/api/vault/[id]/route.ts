import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { decryptSecret, encryptSecret } from '@/lib/vault-crypto';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const PUT = withErrorHandler(async (req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json();
  const { rows: currentRows } = await dbQuery('SELECT * FROM vault_items WHERE id = $1', [id]);
  const current = currentRows[0];
  if (!current) return NextResponse.json({ error: 'not found' }, { status: 404 });
  const currentPassword = decryptSecret(current.password);
  const password = body.clearPassword === true ? '' : (body.password === undefined || body.password === '' ? currentPassword : String(body.password));
  const { rows } = await dbQuery(
    `UPDATE vault_items
     SET category = $1, url = $2, username = $3, password = $4, created_at = COALESCE($5::timestamptz, created_at), valid_days = $6, due_date = $7, updated_at = now()
     WHERE id = $8
     RETURNING *`,
    [
      body.category ? String(body.category).trim() : null,
      String(body.url ?? current.url).trim(),
      body.username ? String(body.username).trim() : null,
      encryptSecret(password),
      body.created_at || null,
      body.valid_days == null || body.valid_days === '' ? null : Number(body.valid_days),
      body.due_date ? String(body.due_date) : null,
      id,
    ],
  );
  const item = rows[0];
  return NextResponse.json({ item: { ...item, password } });
});

export const DELETE = withErrorHandler(async (_req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  await dbQuery('DELETE FROM vault_items WHERE id = $1', [id]);
  return NextResponse.json({ ok: true });
});
