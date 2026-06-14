/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Retry wrapper with exponential backoff.
 * Retries the async function up to maxAttempts times with delays of 1s, 2s, 4s...
 * On the final failure, throws the last captured error.
 */

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
