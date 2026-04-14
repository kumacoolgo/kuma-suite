import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json();
  const title = String(body.title ?? '').trim();
  const url = String(body.url ?? '').trim();
  const icon = body.icon ? String(body.icon).trim() : null;
  if (!title || !url) return NextResponse.json({ error: 'title and url required' }, { status: 400 });

  const { rows: sortRows } = await dbQuery(`SELECT COALESCE(MAX(sort_order), 0) AS max FROM app_links`);
  const sortOrder = Number(sortRows[0]?.max ?? 0) + 1;
  const id = nanoid();
  const { rows } = await dbQuery(
    `INSERT INTO app_links (id, title, url, icon, sort_order)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [id, title, url, icon, sortOrder],
  );
  return NextResponse.json(rows[0]);
}
