
import { createClient } from '@supabase/supabase-js';

// Prioritize environment variables, then fallback to the string (if user edited it), then empty.
// Note: Standard Supabase 'anon' keys start with "eyJ...".
const supabaseUrl = process.env.VITE_SUPABASE_URL || "https://oeapurcoyinabpusapbk.supabase.co";
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || "sb_publishable_GhttayOa1Lmz7q1V20d4Gw_a6Gc9m8I";

// Basic validation check
const isValidUrl = supabaseUrl && supabaseUrl.startsWith('http');
const isValidKey = supabaseKey && supabaseKey.length > 20;

if (isValidKey && !supabaseKey.startsWith('ey')) {
    console.warn("Supabase Key Warning: The provided key does not start with 'ey'. Standard Supabase Anon keys are JWTs starting with 'ey'. If you are using a custom token, ignore this. Otherwise, check your API keys.");
}

export const isSupabaseConfigured = isValidUrl && isValidKey;

// Initialize client only if configured to avoid runtime errors immediately
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;
