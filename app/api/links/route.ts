import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbTransaction } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withErrorHandler(async (req: Request) => {
  const body = await req.json();
  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  const icon = body.icon ? String(body.icon).trim() : null;
  if (!title || !url) return NextResponse.json({ error: 'title and url required' }, { status: 400 });

  const item = await dbTransaction(async (client) => {
    await client.query('LOCK TABLE app_links IN SHARE ROW EXCLUSIVE MODE');
    const { rows: sortRows } = await client.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM app_links');
    const sortOrder = Number(sortRows[0]?.max ?? 0) + 1;
    const id = nanoid();
    const { rows } = await client.query(
      `INSERT INTO app_links (id, title, url, icon, sort_order)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, title, url, icon, sortOrder],
    );
    return rows[0];
  });

  return NextResponse.json(item);
});
