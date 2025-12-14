
import { createClient } from '@supabase/supabase-js';

// Helper to safely access env vars from various sources (Vite, Next, CRA, Node)
const getEnv = (key: string) => {
    // 1. Try Vite standard (import.meta.env)
    try {
        const meta = import.meta as any;
        if (typeof meta !== 'undefined' && meta.env && meta.env[key]) {
            return meta.env[key];
        }
    } catch (e) { }

    // 2. Try Process Env (explicit checks for bundlers that replace strings but don't polyfill the object)
    try {
        if (typeof process !== 'undefined' && process.env) {
            // Explicit checks for common keys to ensure bundler replacement works
            if (key === 'VITE_SUPABASE_URL') return process.env.VITE_SUPABASE_URL;
            if (key === 'VITE_SUPABASE_ANON_KEY') return process.env.VITE_SUPABASE_ANON_KEY;
            
            // Fallback for other frameworks
            if (key === 'NEXT_PUBLIC_SUPABASE_URL') return process.env.NEXT_PUBLIC_SUPABASE_URL;
            if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
            if (key === 'REACT_APP_SUPABASE_URL') return process.env.REACT_APP_SUPABASE_URL;
            if (key === 'REACT_APP_SUPABASE_ANON_KEY') return process.env.REACT_APP_SUPABASE_ANON_KEY;

            // Generic dynamic check (Node.js / some bundlers)
            if (process.env[key]) return process.env[key];
        }
    } catch (e) { }

    return undefined;
};

// Retrieve URL and Key checking multiple common naming conventions
const getSupabaseUrl = () => {
    return getEnv('VITE_SUPABASE_URL') || 
           getEnv('NEXT_PUBLIC_SUPABASE_URL') || 
           getEnv('REACT_APP_SUPABASE_URL') || 
           "";
};

const getSupabaseKey = () => {
    return getEnv('VITE_SUPABASE_ANON_KEY') || 
           getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') || 
           getEnv('REACT_APP_SUPABASE_ANON_KEY') || 
           "";
};

const supabaseUrl = getSupabaseUrl();
const supabaseKey = getSupabaseKey();

// Only consider configured if we have a valid-looking URL and Key
export const isSupabaseConfigured = 
    supabaseUrl && 
    supabaseUrl.startsWith('http') && 
    supabaseKey && 
    supabaseKey.length > 20; // Supabase keys are usually long JWTs

if (!isSupabaseConfigured) {
    console.log("Supabase is not configured (using mock data). To use a real DB, set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
} else {
    console.log("Supabase configured with URL:", supabaseUrl);
}

// Initialize client
export const supabase = isSupabaseConfigured 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;
