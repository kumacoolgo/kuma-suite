import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { dbTransaction } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_IMPORT_SIZE = 5 * 1024 * 1024; // 5 MB

export const POST = withErrorHandler(async (req: Request) => {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  if (file.size > MAX_IMPORT_SIZE) return NextResponse.json({ error: 'file too large (max 5 MB)' }, { status: 413 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  if (!rows.length) return NextResponse.json({ imported: 0 });
  const normalized = rows
    .map((row) => ({
      test_name: String(row.test_name ?? row.testName ?? '').trim(),
      publisher: row.publisher ?? null,
      start_date: row.start_date ?? null,
      end_date: row.end_date ?? null,
      test_case: row.test_case ?? null,
      test_result: row.test_result ?? null,
      gamepack: row.gamepack ?? null,
      work_time: row.work_time ?? null,
      income1: row.income1 ?? null,
      received_date1: row.received_date1 ?? null,
      payment: row.payment ?? null,
      income2: row.income2 ?? null,
      received_date2: row.received_date2 ?? null,
    }))
    .filter((row) => row.test_name);
  const imported = await dbTransaction(async (client) => {
    const { rows: maxRows } = await client.query('SELECT COALESCE(MAX(sort_order), 0) AS max FROM tracker_tasks');
    let nextSort = Number(maxRows[0]?.max ?? 0) + 1;
    for (const row of normalized) {
      await client.query(
        `INSERT INTO tracker_tasks
        (test_name, publisher, start_date, end_date, test_case, test_result, gamepack, work_time, income1, received_date1, payment, income2, received_date2, sort_order)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
        [
          row.test_name,
          row.publisher,
          row.start_date,
          row.end_date,
          row.test_case,
          row.test_result,
          row.gamepack,
          row.work_time,
          row.income1,
          row.received_date1,
          row.payment,
          row.income2,
          row.received_date2,
          nextSort++,
        ],
      );
    }
    return normalized.length;
  });
  return NextResponse.json({ imported });
});
