import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request, ctx: any) {
  const { id } = await Promise.resolve(ctx.params);
  const body = await req.json();
  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  const icon = body.icon ? String(body.icon).trim() : null;
  if (!title || !url) return NextResponse.json({ error: 'title and url required' }, { status: 400 });

  const { rows } = await dbQuery(
    `UPDATE app_links
     SET title = $1, url = $2, icon = $3, updated_at = now()
     WHERE id = $4
     RETURNING *`,
    [title, url, icon, id],
  );
  if (!rows[0]) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(rows[0]);
}

export async function DELETE(_req: Request, ctx: any) {
  const { id } = await Promise.resolve(ctx.params);
  await dbQuery('DELETE FROM app_links WHERE id = $1', [id]);
  await dbQuery(`
    WITH ordered AS (
      SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order ASC, created_at ASC) AS rn
      FROM app_links
    )
    UPDATE app_links AS l
    SET sort_order = ordered.rn
    FROM ordered
    WHERE l.id = ordered.id
  `);
  return NextResponse.json({ ok: true });
}
