import { NextResponse } from 'next/server';

type Handler<T extends unknown[]> = (...args: T) => Promise<NextResponse>;

/**
 * Wraps a Next.js route handler with top-level error handling.
 * Catches unexpected errors and returns a generic 500 instead of leaking stack traces.
 */
export function withErrorHandler<T extends unknown[]>(fn: Handler<T>): Handler<T> {
  return async (...args: T) => {
    try {
      return await fn(...args);
    } catch (err) {
      console.error('[api-handler]', err);
      return NextResponse.json({ error: 'internal server error' }, { status: 500 });
    }
  };
}
