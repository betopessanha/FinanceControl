
import React, { createContext, useContext, useEffect, useState, useRef, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';

// Helper to get timeout duration (Default: 15 minutes)
const getSessionTimeout = () => {
    if (typeof window === 'undefined') return 15 * 60 * 1000;
    const stored = localStorage.getItem('custom_session_timeout');
    const minutes = stored ? parseInt(stored, 10) : 15;
    return minutes * 60 * 1000; // Convert to milliseconds
};

export type UserRole = 'admin' | 'user' | 'driver';

interface User {
    email: string;
    id: string;
    role: UserRole; // Added Role
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
    // Use 'any' or 'number' to avoid NodeJS namespace issues in pure frontend environments
    const logoutTimerRef = useRef<any>(null);

    // --- TIMEOUT LOGIC ---
    const resetInactivityTimer = useCallback(() => {
        if (!user) return;

        if (logoutTimerRef.current) {
            clearTimeout(logoutTimerRef.current);
        }

        const timeoutDuration = getSessionTimeout();

        // Use window.setTimeout to ensure browser behavior
        logoutTimerRef.current = window.setTimeout(() => {
            console.log("Session timed out due to inactivity.");
            handleSignOut();
            alert(`Session expired due to inactivity (${timeoutDuration / 60000} minutes). Please log in again.`);
        }, timeoutDuration);
    }, [user]);

    // Setup Activity Listeners
    useEffect(() => {
        if (!user) return;

        // Initialize timer immediately upon login
        resetInactivityTimer();

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
        
        const handleActivity = () => {
            resetInactivityTimer();
        };

        // Add listeners
        events.forEach(event => window.addEventListener(event, handleActivity));

        // Cleanup
        return () => {
            if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [user, resetInactivityTimer]);

    // --- AUTH LOGIC ---

    const handleSignOut = async () => {
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
        
        if (isSupabaseConfigured && supabase) {
            await supabase.auth.signOut();
        }
        setUser(null);
        // Clear local override if any
        localStorage.removeItem('active_mock_user');
    };

    const signUp = async (email: string, password: string) => {
        // 1. Supabase Auth
        if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
            });
            
            if (error) return { error: error.message };
            
            // Check if email confirmation is required
            if (data.user && !data.session) {
                return { error: null, message: "Registration successful! Please check your email to confirm your account." };
            }
            
            if (data.user) {
                // Default Supabase signups to Admin for this single-tenant app prototype
                setUser({ id: data.user.id, email: data.user.email || email, role: 'admin' });
                return { error: null, message: "Account created successfully!" };
            }
            return { error: "Unknown error during registration." };
        }

        // 2. Mock Auth (Local Storage Simulation)
        const storedUsers = JSON.parse(localStorage.getItem('mock_users_db') || '[]');
        const userExists = storedUsers.some((u: any) => u.email === email);
        
        if (userExists || email === 'admin@trucking.io' || email === 'driver@trucking.io') {
            return { error: "User already exists." };
        }

        // Default new mock users to 'admin' so they can use the app fully, unless specified
        const newUser = { id: `mock-${Date.now()}`, email, password, role: 'admin' };
        storedUsers.push(newUser);
        localStorage.setItem('mock_users_db', JSON.stringify(storedUsers));

        return { error: null, message: "Account created! You can now log in." };
    };

    const signIn = async (email: string, password: string) => {
        console.log("Attempting sign in for:", email);
        
        // 1. Supabase Auth
        if (isSupabaseConfigured && supabase) {
            console.log("Using Supabase Auth");
            const { data, error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) return { error: error.message };
            if (data.user && data.user.email) {
                // In a real app, we would fetch the role from a 'profiles' table here.
                // For this prototype, we assume authenticated Supabase users are Admins/Owners.
                setUser({ id: data.user.id, email: data.user.email, role: 'admin' });
                return { error: null };
            }
        } 
        
        console.log("Using Mock Auth");
        // 2. Mock Auth (Fallback)
        
        // Hardcoded Admin
        if (email === 'admin@trucking.io' && password === 'admin') {
            const mockUser: User = { id: 'mock-admin-id', email, role: 'admin' };
            setUser(mockUser);
            localStorage.setItem('active_mock_user', JSON.stringify(mockUser));
            return { error: null };
        }

        // Hardcoded Driver (Restricted Access)
        if (email === 'driver@trucking.io' && password === 'driver') {
            const mockUser: User = { id: 'mock-driver-id', email, role: 'driver' };
            setUser(mockUser);
            localStorage.setItem('active_mock_user', JSON.stringify(mockUser));
            return { error: null };
        }

        // Check Local Storage Mock Users (Created via Sign Up)
        const storedUsers = JSON.parse(localStorage.getItem('mock_users_db') || '[]');
        const foundUser = storedUsers.find((u: any) => u.email === email && u.password === password);

        if (foundUser) {
            const userObj: User = { id: foundUser.id, email: foundUser.email, role: foundUser.role || 'admin' };
            setUser(userObj);
            localStorage.setItem('active_mock_user', JSON.stringify(userObj));
            return { error: null };
        }

        return { error: "Invalid credentials. Try admin@trucking.io (Admin) or driver@trucking.io (Restricted)" };
    };

    // Initialize Auth State on Load
    useEffect(() => {
        const initAuth = async () => {
            if (isSupabaseConfigured && supabase) {
                // 1. Get Session
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user?.email) {
                    setUser({ id: session.user.id, email: session.user.email, role: 'admin' });
                }

                // 2. Sync App Settings (Timeout)
                try {
                    const { data: settings } = await supabase.from('app_settings').select('*');
                    if (settings) {
                        settings.forEach((s: any) => {
                            if (s.key === 'custom_session_timeout') {
                                localStorage.setItem('custom_session_timeout', s.value);
                            }
                        });
                    }
                } catch(e) { console.error("Failed to sync auth settings", e); }

            } else {
                // Check for mock session persistence
                const stored = localStorage.getItem('active_mock_user');
                if (stored) {
                    setUser(JSON.parse(stored));
                }
            }
            setLoading(false);
        };

        initAuth();

        // Listen for Supabase Auth State Changes
        if (isSupabaseConfigured && supabase) {
            const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
                if (session?.user?.email) {
                    setUser({ id: session.user.id, email: session.user.email, role: 'admin' });
                } else {
                    setUser(null);
                }
            });
            return () => subscription.unsubscribe();
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut: handleSignOut }}>
            {children}
        </AuthContext.Provider>
    );
};
