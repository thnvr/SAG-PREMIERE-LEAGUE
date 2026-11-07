import { createClient } from '@supabase/supabase-js';

// Retrieve credentials from environment variables or custom manual entry
function getCredentials() {
  const customUrl = typeof window !== 'undefined' ? localStorage.getItem('sag_custom_supabase_url') : null;
  const customKey = typeof window !== 'undefined' ? localStorage.getItem('sag_custom_supabase_key') : null;

  let url = (
    customUrl ||
    import.meta.env.VITE_SUPABASE_URL ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
    import.meta.env.SUPABASE_URL ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  let key = (
    customKey ||
    import.meta.env.VITE_SUPABASE_ANON_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    import.meta.env.SUPABASE_ANON_KEY ||
    import.meta.env.VITE_SUPABASE_KEY ||
    import.meta.env.NEXT_PUBLIC_SUPABASE_KEY ||
    ''
  ).trim().replace(/^["']|["']$/g, '');

  // Auto-prepend https:// if omitted
  if (url && !url.startsWith('http://') && !url.startsWith('https://')) {
    url = 'https://' + url;
  }

  // Strip trailing slashes
  if (url) {
    url = url.replace(/\/+$/, '');
  }

  const isValid = Boolean(
    url &&
    key &&
    url.startsWith('https://') &&
    !url.includes('your-project-id') &&
    !url.includes('placeholder')
  );

  return { url, key, isValid };
}

const { url: initialUrl, key: initialKey, isValid: initialValid } = getCredentials();

export const isSupabaseConfigured = initialValid;
export const activeSupabaseUrl = initialUrl;

const safeUrl = initialValid ? initialUrl : 'https://sag-placeholder.supabase.co';
const safeKey = initialValid ? initialKey : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy-fallback-key';

export const supabase = createClient(safeUrl, safeKey, {
  auth: {
    persistSession: true,
    storageKey: 'sag_supabase_session',
    autoRefreshToken: initialValid,
    detectSessionInUrl: false,
  },
});

// Diagnostic health checker to verify connection and tables
export async function checkSupabaseHealth() {
  const { url, key, isValid } = getCredentials();
  if (!isValid) {
    return {
      configured: false,
      reachable: false,
      tablesExist: false,
      message: 'Supabase URL or Anon Key not detected. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.',
      url: url || 'None',
    };
  }

  try {
    const { data, error } = await supabase.from('auction_sessions').select('id').limit(1);
    if (error) {
      if (error.code === '42P01') {
        return {
          configured: true,
          reachable: true,
          tablesExist: false,
          message: 'Connected to Supabase, but tables do not exist yet. Run the SQL schema script in Supabase SQL Editor.',
          url,
        };
      }
      return {
        configured: true,
        reachable: false,
        tablesExist: false,
        message: `Supabase query error: ${error.message}`,
        url,
      };
    }

    return {
      configured: true,
      reachable: true,
      tablesExist: true,
      message: 'Connected to Supabase successfully! All tables ready.',
      url,
    };
  } catch (err) {
    return {
      configured: true,
      reachable: false,
      tablesExist: false,
      message: `Network error reaching Supabase: ${err.message}`,
      url,
    };
  }
}

// Allows user to manually connect their credentials on any device immediately
export function saveCustomCredentials(url, key) {
  if (typeof window === 'undefined') return;
  if (url) localStorage.setItem('sag_custom_supabase_url', url.trim());
  if (key) localStorage.setItem('sag_custom_supabase_key', key.trim());
  window.location.reload();
}

export function clearCustomCredentials() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem('sag_custom_supabase_url');
  localStorage.removeItem('sag_custom_supabase_key');
  window.location.reload();
}

export default supabase;
