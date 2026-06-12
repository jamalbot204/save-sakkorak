/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from '@supabase/supabase-js';

let supabaseInstance: ReturnType<typeof createClient> | null = null;

export function getSupabase() {
  if (!supabaseInstance) {
    const supabaseUrl = (import.meta as any).env.VITE_SUPABASE_URL || '';
    const supabaseAnonKey = (import.meta as any).env.VITE_SUPABASE_ANON_KEY || '';
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.warn("[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Using mock placeholder client.");
      // Graceful mock client so compilation and first render work without crashes
      return createClient("https://placeholder-project-id.supabase.co", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.placeholder-signature");
    }
    
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey);
  }
  return supabaseInstance;
}
