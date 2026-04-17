import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';

export const GET = withErrorHandler(async () => {
  await dbQuery('SELECT 1');
  return NextResponse.json({ ok: true });
});
