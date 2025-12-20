
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

const fileUrl = SUPABASE_URL;
const fileKey = SUPABASE_ANON_KEY;

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_key') : null;

const rawUrl = localUrl || fileUrl || "";
const rawKey = localKey || fileKey || "";

// Validation helpers
export const isKeyLikelyStripe = (key: string) => key.startsWith('sb_publishable_') || key.startsWith('pk_');
export const isKeyCorrectFormat = (key: string) => key.startsWith('eyJ');

// Strictness relaxed: If user entered SOMETHING that looks like a URL and a long key, try it.
const isUrlValid = rawUrl && rawUrl.startsWith('https://') && rawUrl.includes('.supabase.co');
const isKeyValid = rawKey && rawKey.length > 20; // Just check length to let it try

export const isSupabaseConfigured = !!(isUrlValid && isKeyValid);

export const saveConnectionSettings = (url: string, key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem('custom_supabase_url', url.trim());
        localStorage.setItem('custom_supabase_key', key.trim());
        // Clean reload to root
        window.location.href = window.location.origin + window.location.pathname;
    }
};

export const clearConnectionSettings = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('custom_supabase_url');
        localStorage.removeItem('custom_supabase_key');
        window.location.href = window.location.origin + window.location.pathname;
    }
};

export const supabase = isSupabaseConfigured 
    ? createClient(rawUrl, rawKey) 
    : null;
