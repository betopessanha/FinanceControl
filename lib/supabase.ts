import { createClient } from '@supabase/supabase-js';

// 1. Attempt to get variables explicitly from Vite's import.meta.env
const viteUrl = (import.meta as any).env?.VITE_SUPABASE_URL;
const viteKey = (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;

// 2. Fallback helper for other environments
const getProcessEnv = (key: string) => {
    try {
        if (typeof process !== 'undefined' && process.env) {
            return process.env[key];
        }
    } catch (e) { }
    return undefined;
};

// Select the best available value
const rawUrl = viteUrl || getProcessEnv('VITE_SUPABASE_URL') || getProcessEnv('NEXT_PUBLIC_SUPABASE_URL') || "";
const rawKey = viteKey || getProcessEnv('VITE_SUPABASE_ANON_KEY') || getProcessEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || "";

// 3. STRICT Validation
// We check if it's a real URL and not a placeholder like "https://your-project.supabase.co"
const isUrlValid = rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('your-project');
const isKeyValid = rawKey && rawKey.length > 20 && !rawKey.includes('placeholder');

export const isSupabaseConfigured = isUrlValid && isKeyValid;

// --- DEBUG LOGGING (Localhost Only) ---
if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    console.groupCollapsed("🔧 Dev Environment: Database Connection");
    if (isSupabaseConfigured) {
        console.log("Status: ✅ Connected to Supabase");
        console.log("URL:", rawUrl);
    } else {
        console.log("Status: ⚠️ Running in DEMO MODE (Mock Data)");
        console.log("Reason: Missing or invalid .env keys.");
        console.log("To connect DB: Create .env with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY");
    }
    console.groupEnd();
}
// ---------------------

// Initialize client only if valid, otherwise null to force mock data usage
export const supabase = isSupabaseConfigured 
    ? createClient(rawUrl, rawKey) 
    : null;