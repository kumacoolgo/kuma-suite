import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';
import { toCsv } from '@/lib/csv';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async () => {
  const { rows } = await dbQuery('SELECT * FROM tracker_tasks ORDER BY sort_order ASC, created_at ASC');
  const columns = [
    'test_name',
    'publisher',
    'start_date',
    'end_date',
    'test_case',
    'test_result',
    'gamepack',
    'work_time',
    'income1',
    'received_date1',
    'payment',
    'income2',
    'received_date2',
  ].map((key) => ({ key, label: key }));
  const payload = toCsv(rows, columns);
  return new NextResponse(payload, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="game-test-tracker.csv"',
    },
  });
});
