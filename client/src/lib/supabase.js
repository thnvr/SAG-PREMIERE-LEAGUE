// Supabase client singleton — shared across the entire app.
// Environment variables must be set in Vercel project settings:
//   VITE_SUPABASE_URL   — your project URL (e.g. https://xxxx.supabase.co)
//   VITE_SUPABASE_ANON_KEY — your project anon/public key
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. ' +
    'Set them in your .env.local (dev) or Vercel project settings (prod).'
  );
}

export const supabase = createClient(
  supabaseUrl || '',
  supabaseAnonKey || '',
  {
    auth: {
      persistSession: true,
      storageKey: 'sag_supabase_session',
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

export default supabase;
