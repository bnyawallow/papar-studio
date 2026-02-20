
import { createClient } from '@supabase/supabase-js';

// Hardcoded fallbacks from .env.local for debugging/browser-native environments
const FALLBACK_URL = "https://cdrhnsfllxpqpuotzotq.supabase.co";
const FALLBACK_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcmhuc2ZsbHhwcXB1b3R6b3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDQ3OTEsImV4cCI6MjA3Nzc4MDc5MX0.Pbxi609hE7MM8u1j_gBKwIV1xq7PJkatTIJfVEjpSNM";

let supabaseUrl = FALLBACK_URL;
let supabaseAnonKey = FALLBACK_KEY;

try {
  // Safe check for process.env (Next.js/Webpack environment)
  if (typeof process !== 'undefined' && process.env) {
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    }
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    }
  }
} catch (e) {
  // Ignore errors if process is not defined (e.g. native browser modules)
  console.warn("Environment variables not accessible, using fallbacks.");
}

console.log(`[Supabase] Initializing client with URL: ${supabaseUrl}`);

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
