
import { createClient } from '@supabase/supabase-js';

// Vite uses import.meta.env instead of process.env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "https://cdrhnsfllxpqpuotzotq.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkcmhuc2ZsbHhwcXB1b3R6b3RxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjIyMDQ3OTEsImV4cCI6MjA3Nzc4MDc5MX0.Pbxi609hE7MM8u1j_gBKwIV1xq7PJkatTIJfVEjpSNM";

console.log(`[Supabase] Initializing client with URL: ${supabaseUrl}`);

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;
