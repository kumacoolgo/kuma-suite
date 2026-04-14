import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  await dbQuery('SELECT 1');
  return NextResponse.json({ ok: true });
}
