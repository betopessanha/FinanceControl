
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

export type UserRole = 'admin' | 'user' | 'driver';

interface User {
    email: string;
    id: string;
    role: UserRole;
    password?: string; // Only for local storage logic
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
            if (isSupabaseConfigured && supabase) await supabase.auth.signOut();
        } catch (e) {}
        setUser(null);
        localStorage.removeItem('active_session_user');
    };

    const updateLocalCredentials = (email: string, password: string) => {
        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        // Update or add the admin user
        const otherUsers = localUsers.filter((u: any) => u.id !== 'local-admin');
        const newUser = { id: 'local-admin', email, password, role: 'admin' };
        localStorage.setItem('app_local_users', JSON.stringify([...otherUsers, newUser]));
        
        if (user && user.id === 'local-admin') {
            setUser(newUser as any);
            localStorage.setItem('active_session_user', JSON.stringify(newUser));
        }
    };

    const signIn = async (email: string, password: string) => {
        const lowerEmail = email.toLowerCase().trim();
        
        // 1. Try Supabase first if configured
        if (isSupabaseConfigured && supabase) {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({ email: lowerEmail, password });
                if (!error && data.user) {
                    const cloudUser: User = { id: data.user.id, email: data.user.email || lowerEmail, role: 'admin' };
                    setUser(cloudUser);
                    localStorage.setItem('active_session_user', JSON.stringify(cloudUser));
                    return { error: null };
                }
                if (error) return { error: error.message };
            } catch (e) {
                console.warn("Cloud auth error");
            }
        } 

        // 2. Try Local Registered Users
        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        const found = localUsers.find((u: any) => u.email.toLowerCase() === lowerEmail && u.password === password);
        
        if (found) {
            const sessionUser = { id: found.id, email: found.email, role: found.role };
            setUser(sessionUser as any);
            localStorage.setItem('active_session_user', JSON.stringify(sessionUser));
            return { error: null };
        }

        // 3. Fallback/Bypass: Allow "admin/admin" if not explicitly in the list but credentials match
        // This prevents lockouts when localUsers has items but no 'admin' user was officially registered.
        if (lowerEmail === 'admin' && password === 'admin') {
            const initialAdmin = { id: 'local-admin', email: 'admin', role: 'admin' };
            setUser(initialAdmin as any);
            localStorage.setItem('active_session_user', JSON.stringify(initialAdmin));
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
            // Local Sign Up
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            if (localUsers.some((u: any) => u.email.toLowerCase() === lowerEmail)) {
                return { error: "User already exists." };
            }
            const newUser = { id: `local-${Date.now()}`, email: lowerEmail, password, role: 'admin' };
            localStorage.setItem('app_local_users', JSON.stringify([...localUsers, newUser]));
            return { error: null, message: "Local account created successfully. You can now log in." };
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            const stored = localStorage.getItem('active_session_user');
            if (stored) {
                try {
                    setUser(JSON.parse(stored));
                    setLoading(false);
                    return;
                } catch (e) { localStorage.removeItem('active_session_user'); }
            }

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
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut: handleSignOut, updateLocalCredentials }}>
            {children}
        </AuthContext.Provider>
    );
};
