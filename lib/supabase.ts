
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env';

// Chaves padronizadas para persistência do sistema
export const SYSTEM_KEYS = {
    DB_URL: 'trucking_sys_db_url',
    DB_KEY: 'trucking_sys_db_key',
};

const getPersistedSetting = (key: string) => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(key);
};

const fileUrl = SUPABASE_URL;
const fileKey = SUPABASE_ANON_KEY;

const localUrl = getPersistedSetting(SYSTEM_KEYS.DB_URL);
const localKey = getPersistedSetting(SYSTEM_KEYS.DB_KEY);

const rawUrl = localUrl || fileUrl || "";
const rawKey = localKey || fileKey || "";

// Validação rigorosa
const isUrlValid = rawUrl && rawUrl.startsWith('https://') && rawUrl.includes('.supabase.co');
const isKeyValid = rawKey && rawKey.length > 20 && rawKey.startsWith('eyJ');

export const isSupabaseConfigured = !!(isUrlValid && isKeyValid);

/**
 * Salva as configurações e força o recarregamento do estado global
 */
export const saveConnectionSettings = (url: string, key: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(SYSTEM_KEYS.DB_URL, url.trim());
        localStorage.setItem(SYSTEM_KEYS.DB_KEY, key.trim());
        // Recarrega a aplicação para reinicializar o cliente Supabase
        window.location.reload();
    }
};

/**
 * Limpa apenas as credenciais de nuvem
 */
export const clearConnectionSettings = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(SYSTEM_KEYS.DB_URL);
        localStorage.removeItem(SYSTEM_KEYS.DB_KEY);
        window.location.reload();
    }
};

/**
 * Gera uma string codificada para backup da configuração
 */
export const getExportableConfig = () => {
    const url = localStorage.getItem(SYSTEM_KEYS.DB_URL) || "";
    const key = localStorage.getItem(SYSTEM_KEYS.DB_KEY) || "";
    if (!url || !key) return null;
    return btoa(JSON.stringify({ url, key }));
};

/**
 * Importa configuração a partir de uma string de backup
 */
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

export const supabase = isSupabaseConfigured 
    ? createClient(rawUrl, rawKey) 
    : null;

export const hasActiveSupabaseSession = async (): Promise<boolean> => {
    if (!supabase) return false;
    const { data: { session } } = await supabase.auth.getSession();
    return !!session;
};
