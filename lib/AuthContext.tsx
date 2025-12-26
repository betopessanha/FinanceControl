
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured, SYSTEM_KEYS } from './supabase';

export type UserRole = 'admin' | 'user' | 'driver';

interface User {
    email: string;
    id: string;
    role: UserRole;
    password?: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null, message?: string }>;
    signOut: () => Promise<void>;
    updateLocalCredentials: (email: string, password: string) => void;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
    updateLocalCredentials: () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const handleSignOut = async () => {
        try {
            if (isSupabaseConfigured && supabase) {
                await supabase.auth.signOut();
            }
        } catch (e) {
            console.error("Error signing out from cloud:", e);
        }
        setUser(null);
        localStorage.removeItem(SYSTEM_KEYS.SESSION_USER);
        // Remove apenas chaves de sessão do Supabase, não configurações do sistema
        for (const key in localStorage) {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        }
    };

    const updateLocalCredentials = (email: string, password: string) => {
        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        const otherUsers = localUsers.filter((u: any) => u.id !== 'local-admin');
        const newUser = { id: 'local-admin', email, password, role: 'admin' as UserRole };
        localStorage.setItem('app_local_users', JSON.stringify([...otherUsers, newUser]));
        
        if (user && user.id === 'local-admin') {
            setUser(newUser);
            localStorage.setItem(SYSTEM_KEYS.SESSION_USER, JSON.stringify(newUser));
        }
    };

    const signIn = async (email: string, password: string) => {
        const lowerEmail = email.toLowerCase().trim();
        
        if (isSupabaseConfigured && supabase) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email: lowerEmail, password });
                if (!error && data.user) {
                    const cloudUser: User = { id: data.user.id, email: data.user.email || lowerEmail, role: 'admin' };
                    setUser(cloudUser);
                    localStorage.setItem(SYSTEM_KEYS.SESSION_USER, JSON.stringify(cloudUser));
                    return { error: null };
                }
                // Se o erro for de conexão ou serviço, tenta o login local como fallback
                if (error && !error.message.includes('Invalid login credentials')) {
                    console.warn("Cloud auth error, attempting local fallback...");
                } else if (error) {
                    return { error: error.message };
                }
            } catch (e: any) {
                console.warn("Cloud service unavailable, using local fallback.");
            }
        } 

        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        const found = localUsers.find((u: any) => u.email.toLowerCase() === lowerEmail && u.password === password);
        
        if (found) {
            const sessionUser: User = { id: found.id, email: found.email, role: found.role as UserRole };
            setUser(sessionUser);
            localStorage.setItem(SYSTEM_KEYS.SESSION_USER, JSON.stringify(sessionUser));
            return { error: null };
        }

        if (lowerEmail === 'admin' && password === 'admin') {
            const initialAdmin: User = { id: 'local-admin', email: 'admin', role: 'admin' };
            setUser(initialAdmin);
            localStorage.setItem(SYSTEM_KEYS.SESSION_USER, JSON.stringify(initialAdmin));
            return { error: null };
        }

        return { error: "Invalid credentials. Please check your user and password." };
    };

    const signUp = async (email: string, password: string) => {
        const lowerEmail = email.toLowerCase().trim();
        if (isSupabaseConfigured && supabase) {
            try {
                const { data, error } = await supabase.auth.signUp({ email: lowerEmail, password });
                if (error) return { error: error.message };
                return { error: null, message: "Check your email for confirmation." };
            } catch (e) {
                return { error: "Could not connect to cloud." };
            }
        } else {
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            if (localUsers.some((u: any) => u.email.toLowerCase() === lowerEmail)) {
                return { error: "User already exists." };
            }
            const newUser = { id: `local-${Date.now()}`, email: lowerEmail, password, role: 'admin' as UserRole };
            localStorage.setItem('app_local_users', JSON.stringify([...localUsers, newUser]));
            return { error: null, message: "Local account created successfully." };
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            try {
                // 1. Recupera sessão local instantaneamente para evitar logoff visual
                const stored = localStorage.getItem(SYSTEM_KEYS.SESSION_USER);
                if (stored) {
                    try {
                        setUser(JSON.parse(stored) as User);
                    } catch (e) {
                        localStorage.removeItem(SYSTEM_KEYS.SESSION_USER);
                    }
                }

                // 2. Valida com a nuvem em background se configurado
                if (isSupabaseConfigured && supabase) {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    if (session?.user) {
                        const cloudUser: User = { id: session.user.id, email: session.user.email || '', role: 'admin' };
                        setUser(cloudUser);
                        localStorage.setItem(SYSTEM_KEYS.SESSION_USER, JSON.stringify(cloudUser));
                    } else if (error) {
                        // Não desloga em erros de conexão, apenas se a sessão for explicitamente inválida
                        if (error.status === 400 || error.status === 401) {
                            console.warn("Session expired. Keeping local profile if available.");
                        }
                    }
                }
            } catch (e) {
                console.error("Auth init error:", e);
            } finally {
                setLoading(false);
            }
        };
        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut: handleSignOut, updateLocalCredentials }}>
            {children}
        </AuthContext.Provider>
    );
};
