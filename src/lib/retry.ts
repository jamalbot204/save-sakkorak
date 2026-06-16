/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retry wrapper with exponential backoff.
 * Retries the async function up to maxAttempts times with delays of 1s, 2s, 4s...
 * Permanent errors (4xx HTTP, PostgREST data/schema/permission codes) fail immediately.
 * On the final failure, throws the last captured error.
 */

function isTransient(err: any): boolean {
  if (err instanceof TypeError) return true;
  if (err?.message?.includes('انتهت مهلة')) return true;

  if (typeof err?.status === 'number') {
    if (err.status === 429) return true;
    if (err.status >= 500 && err.status < 600) return true;
    return false;
  }

  if (typeof err?.code === 'string') {
    const c = err.code;
    if (c.startsWith('08')) return true;
    if (c.startsWith('53')) return true;
    if (c.startsWith('57')) return true;
    return false;
  }

  return false;
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  label: string = "operation"
): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isTransient(err)) {
        console.warn(`[Retry] ${label} permanent error, not retrying:`, err?.message || err?.code);
        throw err;
      }
      if (attempt < maxAttempts - 1) {
        const delay = 1000 * Math.pow(2, attempt);
        console.warn(`[Retry] ${label} attempt ${attempt + 1}/${maxAttempts} failed, retrying in ${delay}ms`);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  console.error(`[Retry] ${label} exhausted all ${maxAttempts} attempts`);
  throw lastError;
}
