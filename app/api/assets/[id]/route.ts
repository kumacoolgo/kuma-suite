import { NextResponse } from 'next/server';
import { dbQuery } from '@/lib/db';
import { withErrorHandler } from '@/lib/api-handler';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = withErrorHandler(async (_req: Request, ctx: any) => {
  const { id } = await Promise.resolve(ctx.params);
  const { rows } = await dbQuery('SELECT * FROM app_assets WHERE id = $1', [id]);
  const asset = rows[0];
  if (!asset) return new NextResponse('Not found', { status: 404 });
  return new NextResponse(new Uint8Array(Buffer.from(asset.data)), {
    status: 200,
    headers: {
      'Content-Type': asset.mime_type,
      'Content-Disposition': `inline; filename="${asset.filename}"`,
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
});
