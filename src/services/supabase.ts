
import { createClient } from '@supabase/supabase-js';

// Vite uses import.meta.env instead of process.env
// Ensure these environment variables are set in your .env file:
// VITE_SUPABASE_URL=your_supabase_url
// VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Track Supabase connection status for UI feedback
export let isSupabaseConfigured = false;
export let supabaseConfigError: string | null = null;

if (!supabaseUrl || !supabaseAnonKey) {
  supabaseConfigError = "Supabase credentials not configured. App will run in offline/local mode.";
  console.error("[Supabase] " + supabaseConfigError);
  
  // Dispatch custom event so UI can show notification
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('supabase-config-error', { 
      detail: { message: supabaseConfigError } 
    }));
  }
} else {
  isSupabaseConfigured = true;
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
