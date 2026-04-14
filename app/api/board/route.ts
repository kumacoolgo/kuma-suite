import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const { rows } = await dbQuery('SELECT content, font_size_px, updated_at FROM board_documents WHERE id = 1 LIMIT 1');
  const row = rows[0] || { content: '', font_size_px: 18, updated_at: null };
  return NextResponse.json(row);
}

export async function PUT(req: Request) {
  const body = await req.json();
  const content = String(body.content ?? '');
  const fontSize = Math.max(12, Math.min(40, Number(body.font_size_px ?? 18) || 18));
  const { rows } = await dbQuery(
    `UPDATE board_documents SET content = $1, font_size_px = $2, updated_at = now() WHERE id = 1 RETURNING content, font_size_px, updated_at`,
    [content, fontSize],
  );
  return NextResponse.json(rows[0]);
}

export async function DELETE() {
  const { rows } = await dbQuery(
    `UPDATE board_documents SET content = '', updated_at = now() WHERE id = 1 RETURNING content, font_size_px, updated_at`
  );
  return NextResponse.json(rows[0]);
}
