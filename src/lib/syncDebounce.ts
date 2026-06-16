/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared trailing debounce for background sync triggers.
 * Multiple rapid mutations coalesce into a single sync after the
 * user stops making changes for 500ms.
 */

let timer: ReturnType<typeof setTimeout> | null = null;

export function scheduleDebouncedSync(fn: () => void): void {
  if (timer !== null) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    fn();
  }, 500);
}
