import { createClient } from '@supabase/supabase-js';

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Check if valid credentials are provided
export const isSupabaseConfigured = Boolean(
  rawUrl &&
  rawKey &&
  rawUrl.startsWith('http') &&
  !rawUrl.includes('your-project-id')
);

if (!isSupabaseConfigured) {
  console.warn(
    '[Supabase] Missing or placeholder VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
    'Running in safe fallback mode. Add your Supabase credentials in Vercel to connect live database.'
  );
}

// Fallback to safe dummy URL so createClient NEVER throws an uncaught exception on load
const safeUrl = isSupabaseConfigured ? rawUrl : 'https://sag-placeholder.supabase.co';
const safeKey = isSupabaseConfigured ? rawKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-fallback-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    storageKey: 'sag_supabase_session',
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: false,
  },
});

export default supabase;
