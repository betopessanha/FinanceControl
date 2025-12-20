
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type UserRole = 'admin' | 'user' | 'driver';

interface User {
    email: string;
    id: string;
    role: UserRole;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: string | null }>;
    signUp: (email: string, password: string) => Promise<{ error: string | null, message?: string }>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
    signIn: async () => ({ error: null }),
    signUp: async () => ({ error: null }),
    signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const handleSignOut = async () => {
        try {
            if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
        } catch (e) {}
        setUser(null);
        localStorage.removeItem('active_mock_user');
    };

    const signIn = async (email: string, password: string) => {
        const lowerEmail = email.toLowerCase().trim();
        
        // --- EMERGENCY BYPASS (DO NOT CHANGE) ---
        if ((lowerEmail === 'admin' && password === 'admin') || (lowerEmail === 'admin@trucking.io' && password === 'admin')) {
            const mockUser: User = { id: 'mock-admin', email: 'admin@trucking.io', role: 'admin' };
            setUser(mockUser);
            localStorage.setItem('active_mock_user', JSON.stringify(mockUser));
            return { error: null };
        }

        // Try Supabase if configured
        if (isSupabaseConfigured && supabase) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email: lowerEmail, password });
                if (!error && data.user) {
                    setUser({ id: data.user.id, email: data.user.email || lowerEmail, role: 'admin' });
                    return { error: null };
                }
                if (error) return { error: error.message };
            } catch (e) {
                console.warn("Supabase auth connection error");
            }
        } 

        return { error: "Invalid credentials. Try 'admin' / 'admin'" };
    };

    const signUp = async (email: string, password: string) => {
        if (isSupabaseConfigured && supabase) {
            try {
                const { data, error } = await supabase.auth.signUp({ email, password });
                if (error) return { error: error.message };
                return { error: null, message: "Check your email for confirmation." };
            } catch (e) {
                return { error: "Could not connect to cloud." };
            }
        }
        return { error: "Sign up is only available in Cloud Mode. Use admin/admin for local demo." };
    };

    useEffect(() => {
        const initAuth = async () => {
            // Priority 1: Local Session
            const stored = localStorage.getItem('active_mock_user');
            if (stored) {
                try {
                    setUser(JSON.parse(stored));
                    setLoading(false);
                    return;
                } catch (e) { localStorage.removeItem('active_mock_user'); }
            }

            // Priority 2: Supabase (only if configured)
            if (isSupabaseConfigured && supabase) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (session?.user) {
                        setUser({ id: session.user.id, email: session.user.email || '', role: 'admin' });
                    }
                } catch (e) {}
            }
            
            setLoading(false);
        };
        initAuth();
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut: handleSignOut }}>
            {children}
        </AuthContext.Provider>
    );
};
