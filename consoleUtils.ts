/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

const ARABIC_RANGE = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;

function isArabic(c: string): boolean {
  return ARABIC_RANGE.test(c);
}

/**
 * Reverses Arabic character sequences within a string so that RTL text
 * renders in correct visual order on Windows terminals (PowerShell/CMD)
 * which do not support bidirectional text shaping.
 */
export function reverseArabicForConsole(text: string): string {
  const segments: string[] = [];
  let current = '';
  let currentIsArabic: boolean | null = null;

  for (const ch of text) {
    const chIsArabic = isArabic(ch);

    if (currentIsArabic === null) {
      currentIsArabic = chIsArabic;
      current = ch;
      continue;
    }

    if (chIsArabic === currentIsArabic) {
      current += ch;
    } else {
      segments.push(currentIsArabic ? current.split('').reverse().join('') : current);
      current = ch;
      currentIsArabic = chIsArabic;
    }
  }

  if (current) {
    segments.push(currentIsArabic ? current.split('').reverse().join('') : current);
  }

  return segments.join('');
}
