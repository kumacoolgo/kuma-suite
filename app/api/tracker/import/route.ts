import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'file required' }, { status: 400 });
  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: null });
  if (!rows.length) return NextResponse.json({ imported: 0 });
  const { rows: maxRows } = await dbQuery('SELECT COALESCE(MAX(sort_order), 0) AS max FROM tracker_tasks');
  let nextSort = Number(maxRows[0]?.max ?? 0) + 1;
  let imported = 0;
  for (const row of rows) {
    const testName = String(row.test_name ?? row.testName ?? '').trim();
    if (!testName) continue;
    await dbQuery(
      `INSERT INTO tracker_tasks
       (test_name, publisher, start_date, end_date, test_case, test_result, gamepack, work_time, income1, received_date1, payment, income2, received_date2, sort_order)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
      [
        testName,
        row.publisher ?? null,
        row.start_date ?? null,
        row.end_date ?? null,
        row.test_case ?? null,
        row.test_result ?? null,
        row.gamepack ?? null,
        row.work_time ?? null,
        row.income1 ?? null,
        row.received_date1 ?? null,
        row.payment ?? null,
        row.income2 ?? null,
        row.received_date2 ?? null,
        nextSort++,
      ],
    );
    imported += 1;
  }
  return NextResponse.json({ imported });
}
