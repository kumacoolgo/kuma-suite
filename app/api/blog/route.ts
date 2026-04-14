import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getProfile() {
  const { rows } = await dbQuery(`SELECT * FROM app_profile WHERE id = 1 LIMIT 1`);
  return rows[0] ?? { id: 1, name: 'Kuma', bio: '', avatar_url: null, background_url: null };
}

async function getLinks() {
  const { rows } = await dbQuery(`SELECT * FROM app_links ORDER BY sort_order ASC, created_at ASC`);
  return rows;
}

export async function GET() {
  const [profile, links] = await Promise.all([getProfile(), getLinks()]);
  return NextResponse.json({ profile, links });
}
