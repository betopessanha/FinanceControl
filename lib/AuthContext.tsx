
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
            if (isSupabaseConfigured && supabase) {
                await supabase.auth.signOut();
            }
        } catch (e) {
            console.error("Error signing out:", e);
        }
        setUser(null);
        localStorage.removeItem('active_session_user');
        // Clear Supabase specific keys to prevent refresh token errors
        for (const key in localStorage) {
            if (key.startsWith('sb-')) localStorage.removeItem(key);
        }
    };

    const updateLocalCredentials = (email: string, password: string) => {
        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        const otherUsers = localUsers.filter((u: any) => u.id !== 'local-admin');
        // Fix: Explicitly cast role to UserRole
        const newUser = { id: 'local-admin', email, password, role: 'admin' as UserRole };
        localStorage.setItem('app_local_users', JSON.stringify([...otherUsers, newUser]));
        
        if (user && user.id === 'local-admin') {
            setUser(newUser);
            localStorage.setItem('active_session_user', JSON.stringify(newUser));
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
                    localStorage.setItem('active_session_user', JSON.stringify(cloudUser));
                    return { error: null };
                }
                if (error) return { error: error.message };
            } catch (e: any) {
                return { error: e.message || "Cloud authentication service unavailable." };
            }
        } 

        const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
        const found = localUsers.find((u: any) => u.email.toLowerCase() === lowerEmail && u.password === password);
        
        if (found) {
            // Fix: Explicitly type sessionUser as User to ensure role is correctly assigned as UserRole
            const sessionUser: User = { id: found.id, email: found.email, role: found.role as UserRole };
            setUser(sessionUser);
            localStorage.setItem('active_session_user', JSON.stringify(sessionUser));
            return { error: null };
        }

        if (lowerEmail === 'admin' && password === 'admin') {
            // Fix: Explicitly type initialAdmin as User
            const initialAdmin: User = { id: 'local-admin', email: 'admin', role: 'admin' };
            setUser(initialAdmin);
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
            const localUsers = JSON.parse(localStorage.getItem('app_local_users') || '[]');
            if (localUsers.some((u: any) => u.email.toLowerCase() === lowerEmail)) {
                return { error: "User already exists." };
            }
            // Fix: Explicitly cast role to UserRole
            const newUser = { id: `local-${Date.now()}`, email: lowerEmail, password, role: 'admin' as UserRole };
            localStorage.setItem('app_local_users', JSON.stringify([...localUsers, newUser]));
            return { error: null, message: "Local account created successfully. You can now log in." };
        }
    };

    useEffect(() => {
        const initAuth = async () => {
            setLoading(true);
            try {
                // Check local session first
                const stored = localStorage.getItem('active_session_user');
                if (stored) {
                    // Fix: Cast JSON.parse result to User
                    setUser(JSON.parse(stored) as User);
                }

                // If Supabase is active, check the actual cloud session
                if (isSupabaseConfigured && supabase) {
                    const { data: { session }, error } = await supabase.auth.getSession();
                    
                    // If there's a refresh token error, clear session
                    if (error && (error.message.includes('Refresh Token') || error.status === 401)) {
                        console.warn("Auth session expired or invalid. Clearing local state.");
                        handleSignOut();
                    } else if (session?.user) {
                        // Fix: Explicitly type cloudUser as User
                        const cloudUser: User = { id: session.user.id, email: session.user.email || '', role: 'admin' };
                        setUser(cloudUser);
                        localStorage.setItem('active_session_user', JSON.stringify(cloudUser));
                    }
                }
            } catch (e) {
                console.error("Auth initialization failed:", e);
                // Fail silently and let user log in again
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
