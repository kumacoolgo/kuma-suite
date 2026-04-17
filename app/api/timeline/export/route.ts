import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const { rows } = await dbQuery('SELECT * FROM timeline_items ORDER BY sort_order ASC, created_at ASC');
  const payload = JSON.stringify(rows, null, 2);
  return new NextResponse(Buffer.from(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': 'attachment; filename="timeline.json"',
    },
  });
});
