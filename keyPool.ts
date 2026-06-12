/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface KeyEntry {
  key: string;
  cooldownUntil: number;
  successCount: number;
  failureCount: number;
  lastUsed: number;
}

export class KeyPoolManager {
  private static keys: KeyEntry[] = [];
  private static currentIndex = 0;
  private static isInitialized = false;

  public static initialize(): void {
    if (this.isInitialized) return;

    const envKeys = process.env.GEMINI_API_KEYS;
    const rawKeysList = envKeys ? envKeys.split(",") : [];
    const fallbackKey = process.env.GEMINI_API_KEY;

    const uniqueKeys = new Set<string>();

    rawKeysList.forEach((k) => {
      const trimmed = k.trim();
      if (trimmed) {
        uniqueKeys.add(trimmed);
      }
    });

    if (fallbackKey) {
      const trimmedFallback = fallbackKey.trim();
      if (trimmedFallback) {
        uniqueKeys.add(trimmedFallback);
      }
    }

    this.keys = Array.from(uniqueKeys).map((key) => ({
      key,
      cooldownUntil: 0,
      successCount: 0,
      failureCount: 0,
      lastUsed: 0,
    }));

    this.isInitialized = true;
    console.log(`[KeyPoolManager] Initialized with ${this.keys.length} unique Gemini API keys.`);
  }

  public static getActiveKey(): string {
    this.initialize();
    
    if (this.keys.length === 0) {
      throw new Error("No Gemini API keys configured in environment variables GEMINI_API_KEYS or GEMINI_API_KEY.");
    }

    const now = Date.now();
    
    // Attempt round robin from currentIndex
    for (let i = 0; i < this.keys.length; i++) {
      const index = (this.currentIndex + i) % this.keys.length;
      const entry = this.keys[index];
      
      if (entry.cooldownUntil <= now) {
        this.currentIndex = (index + 1) % this.keys.length;
        entry.lastUsed = now;
        return entry.key;
      }
    }

    // If all keys are in cooldown, grab the first one that cools down soonest, or fallback to any key
    console.warn("[KeyPoolManager] All keys are in cooldown. Choosing the key close to cooling down.");
    const sorted = [...this.keys].sort((a, b) => a.cooldownUntil - b.cooldownUntil);
    const chosen = sorted[0];
    chosen.lastUsed = now;
    return chosen.key;
  }

  public static markFailure(key: string, status?: number, msg?: string): void {
    this.initialize();
    
    const entry = this.keys.find((entry) => entry.key === key);
    if (!entry) return;

    entry.failureCount++;
    const now = Date.now();
    
    // Cooldown duration: 5 minutes if rate-limited (429 or quota limit mentions), 1 minute for other errors
    const isRateLimit = status === 429 || (msg && (msg.toLowerCase().includes("quota") || msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("429")));
    const duration = isRateLimit ? 5 * 60 * 1000 : 1 * 60 * 1000;
    
    entry.cooldownUntil = now + duration;
    
    console.warn(`[KeyPoolManager] Key failure registered. Key placed on cooldown for ${duration / 1000}s. Status: ${status || "N/A"}. Reason: ${msg || "Unknown error"}`);
  }

  public static markSuccess(key: string): void {
    this.initialize();
    
    const entry = this.keys.find((entry) => entry.key === key);
    if (!entry) return;

    entry.successCount++;
    entry.cooldownUntil = 0; // Reset cooldown on clean success
  }

  public static getStats() {
    this.initialize();
    
    const now = Date.now();
    return this.keys.map((entry) => ({
      maskedKey: entry.key.substring(0, 8) + "..." + entry.key.substring(entry.key.length - 4),
      cooldownRemainingMs: Math.max(0, entry.cooldownUntil - now),
      successCount: entry.successCount,
      failureCount: entry.failureCount,
      isCooldown: entry.cooldownUntil > now,
    }));
  }
}
