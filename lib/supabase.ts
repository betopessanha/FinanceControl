import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// 1. Attempt to get variables from the manual config file (lib/env.ts)
// This allows you to hardcode keys if .env files are not supported in your environment.
const fileUrl = SUPABASE_URL;
const fileKey = SUPABASE_ANON_KEY;

// 2. Attempt to get variables from Local Storage (UI Override)
const localUrl = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_url') : null;
const localKey = typeof window !== 'undefined' ? localStorage.getItem('custom_supabase_key') : null;

// 3. Attempt to get variables explicitly from Vite's import.meta.env
const viteUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const viteKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// 4. Fallback helper for other environments
const getProcessEnv = (key: string) => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch (e) { }
    return undefined;
};

// Select the best available value (Priority: lib/env.ts > LocalStorage > .env > Process)
const rawUrl = fileUrl || localUrl || viteUrl || getProcessEnv('VITE_SUPABASE_URL') || getProcessEnv('NEXT_PUBLIC_SUPABASE_URL') || "";
const rawKey = fileKey || localKey || viteKey || getProcessEnv('VITE_SUPABASE_ANON_KEY') || getProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || "";

// 5. STRICT Validation
const isUrlValid = rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('your-project');
const isKeyValid = rawKey && rawKey.length > 20 && !rawKey.includes('placeholder');

export const isSupabaseConfigured = isUrlValid && isKeyValid;

// Helper to save settings from UI
export const saveConnectionSettings = (url: string, key: string) => {
    localStorage.setItem('custom_supabase_url', url);
    localStorage.setItem('custom_supabase_key', key);
    window.location.reload(); // Reload to re-initialize client
};

export const clearConnectionSettings = () => {
    localStorage.removeItem('custom_supabase_url');
    localStorage.removeItem('custom_supabase_key');
    window.location.reload();
};

// --- DEBUG LOGGING ---
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.groupCollapsed("🔧 Dev Environment: Database Connection");
    if (isSupabaseConfigured) {
        console.log("Status: ✅ Connected to Supabase");
        if (fileUrl) console.log("Source: 📁 lib/env.ts (Hardcoded)");
        else if (localUrl) console.log("Source: 💾 LocalStorage (Manual UI)");
        else console.log("Source: 📄 .env File");
        console.log("URL:", rawUrl);
    } else {
        console.log("Status: ⚠️ Running in DEMO MODE");
        console.log("Reason: No valid credentials found in lib/env.ts or settings.");
    }
    console.groupEnd();
}

// Initialize client only if valid, otherwise null to force mock data usage
export const supabase = isSupabaseConfigured 
    ? createClient(rawUrl, rawKey) 
    : null;