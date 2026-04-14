import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function PUT(req: Request) {
  const body = await req.json();
  const name = String(body.name ?? '').trim() || 'Kuma';
  const bio = String(body.bio ?? '');
  const avatarUrl = body.avatar_url ? String(body.avatar_url).trim() : null;
  const backgroundUrl = body.background_url ? String(body.background_url).trim() : null;

  const { rows } = await dbQuery(
    `UPDATE app_profile
     SET name = $1, bio = $2, avatar_url = $3, background_url = $4, updated_at = now()
     WHERE id = 1
     RETURNING *`,
    [name, bio, avatarUrl || null, backgroundUrl || null],
  );
  return NextResponse.json(rows[0]);
}
