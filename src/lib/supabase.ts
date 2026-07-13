import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Browser Supabase client (anon key — public by design, guarded by RLS).
// If env isn't configured, `supabase` is null and the app runs in
// "no-account" mode: generation still works, persistence is disabled.
const url = import.meta.env.VITE_SUPABASE_URL;
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase: SupabaseClient | null =
  url && anon ? createClient(url, anon) : null;

export const authEnabled = !!supabase;
