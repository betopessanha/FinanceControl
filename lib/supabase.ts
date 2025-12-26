
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Chaves padronizadas e protegidas para o sistema
export const SYSTEM_KEYS = {
    DB_URL: 'trucking_sys_db_url',
    DB_KEY: 'trucking_sys_db_key',
    SESSION_USER: 'active_session_user',
    REMEMBERED: 'remembered_user'
};

const getPersistedSetting = (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
};

const localUrl = getPersistedSetting(SYSTEM_KEYS.DB_URL);
const localKey = getPersistedSetting(SYSTEM_KEYS.DB_KEY);

// Prioridade: LocalStorage (Configurado pelo usuário) > env.ts (Configurado no código)
const rawUrl = localUrl || SUPABASE_URL || "";
const rawKey = localKey || SUPABASE_ANON_KEY || "";

// Validação de formato Supabase
const isUrlValid = rawUrl && rawUrl.startsWith('https://') && rawUrl.includes('.supabase.co');
const isKeyValid = rawKey && rawKey.length > 20 && rawKey.startsWith('eyJ');

export const isSupabaseConfigured = !!(isUrlValid && isKeyValid);

/**
 * Salva as configurações de nuvem de forma persistente.
 * Só recarrega a página se a configuração for efetivamente nova.
 */
export const saveConnectionSettings = (url: string, key: string) => {
    if (typeof window !== 'undefined') {
        const currentUrl = localStorage.getItem(SYSTEM_KEYS.DB_URL);
        const currentKey = localStorage.getItem(SYSTEM_KEYS.DB_KEY);
        
        const newUrl = url.trim();
        const newKey = key.trim();

        if (currentUrl === newUrl && currentKey === newKey) {
            console.log("Configuration unchanged. Skipping reload.");
            return;
        }

        localStorage.setItem(SYSTEM_KEYS.DB_URL, newUrl);
        localStorage.setItem(SYSTEM_KEYS.DB_KEY, newKey);
        
        // Força o recarregamento para re-instanciar o singleton do Supabase
        window.location.reload();
    }
};

/**
 * Limpa apenas as credenciais de nuvem, preservando dados locais e sessão se possível.
 */
export const clearConnectionSettings = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(SYSTEM_KEYS.DB_URL);
        localStorage.removeItem(SYSTEM_KEYS.DB_KEY);
        window.location.reload();
    }
};

export const getExportableConfig = () => {
    const url = localStorage.getItem(SYSTEM_KEYS.DB_URL) || "";
    const key = localStorage.getItem(SYSTEM_KEYS.DB_KEY) || "";
    if (!url || !key) return null;
    return btoa(JSON.stringify({ url, key }));
};

export const importConfig = (encoded: string) => {
    try {
        const decoded = JSON.parse(atob(encoded));
        if (decoded.url && decoded.key) {
            saveConnectionSettings(decoded.url, decoded.key);
            return true;
        }
    } catch (e) {
        console.error("Invalid config string");
    }
    return false;
};

// Singleton do cliente Supabase
export const supabase = isSupabaseConfigured 
    ? createClient(rawUrl, rawKey, {
        auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: true
        }
    }) 
    : null;

export const hasActiveSupabaseSession = async (): Promise<boolean> => {
    if (!supabase) return false;
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return !!session;
    } catch (e) {
        return false;
    }
};
