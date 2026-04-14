import { NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  const id = nanoid();
  const buffer = Buffer.from(await file.arrayBuffer());
  await dbQuery(
    `INSERT INTO app_assets (id, filename, mime_type, data) VALUES ($1, $2, $3, $4)`,
    [id, file.name || id, file.type || 'application/octet-stream', buffer],
  );
  return NextResponse.json({ id, url: `/api/assets/${id}` });
}
