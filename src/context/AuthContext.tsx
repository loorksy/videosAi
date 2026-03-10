import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { setAIAuthToken } from '../lib/aiProvider';

export interface User {
    id: string;
    username: string;
    role: 'admin' | 'user';
    status: 'pending' | 'approved' | 'banned';
    tenantId: string;
    creditsBalance?: number;
    totalUsage?: number;
}

interface AuthContextType {
    user: User | null;
    token: string | null;
    login: (token: string, user: User) => void;
    logout: () => void;
    refreshUser: () => Promise<void>;
    isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function initAuth() {
            const storedToken = localStorage.getItem('token');
            if (storedToken) {
                try {
                    const res = await fetch('/api/auth/me', {
                        headers: { Authorization: `Bearer ${storedToken}` }
                    });
                    if (res.ok) {
                        const data = await res.json();
                        setUser(data.user);
                        setToken(storedToken);
                        setAIAuthToken(storedToken);
                    } else {
                        localStorage.removeItem('token');
                        setToken(null);
                    }
                } catch (e) {
                    console.error("Auth init failed", e);
                }
            }
            setIsLoading(false);
        }
        initAuth();
    }, []);

    const login = (newToken: string, userData: User) => {
        localStorage.setItem('token', newToken);
        setToken(newToken);
        setUser(userData);
        setAIAuthToken(newToken);
    };

    const logout = () => {
        localStorage.removeItem('token');
        setAIAuthToken(null);
        setToken(null);
        setUser(null);
    };

    const refreshUser = useCallback(async () => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) return;
        try {
            const res = await fetch('/api/auth/me', {
                headers: { Authorization: `Bearer ${storedToken}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data.user);
            }
        } catch (e) {
            console.error('Refresh user failed', e);
        }
    }, []);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, refreshUser, isLoading }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
