import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export interface Job {
    id: string;
    type: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    result_url?: string;
    error?: string;
    created_at: string;
    updated_at: string;
}

interface GenerationContextType {
    activeJobs: Job[];
    refreshJobs: () => Promise<void>;
}

const GenerationContext = createContext<GenerationContextType | undefined>(undefined);

export function GenerationProvider({ children }: { children: React.ReactNode }) {
    const [activeJobs, setActiveJobs] = useState<Job[]>([]);
    const { user } = useAuth();

    const refreshJobs = async () => {
        if (!user) return;
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/jobs/active', {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (res.ok) {
                const jobs = await res.json();
                setActiveJobs(Array.isArray(jobs) ? jobs : []);
            }
        } catch (err) {
            console.error('Failed to fetch active jobs', err);
        }
    };

    useEffect(() => {
        if (!user) {
            setActiveJobs([]);
            return;
        }

        // Initial fetch
        refreshJobs();

        // Poll every 5 seconds
        const interval = setInterval(refreshJobs, 5000);
        return () => clearInterval(interval);
    }, [user]);

    return (
        <GenerationContext.Provider value={{ activeJobs, refreshJobs }}>
            {children}
        </GenerationContext.Provider>
    );
}

export const useGeneration = () => {
    const context = useContext(GenerationContext);
    if (context === undefined) {
        throw new Error('useGeneration must be used within a GenerationProvider');
    }
    return context;
};
