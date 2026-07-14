import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Bug Fix #3: Centralize the logout logic into one function used everywhere,
    // including the API interceptor's custom event
    const clearAuth = useCallback(() => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Do NOT set the axios header here — the request interceptor in api.js
        // reads from localStorage on every request, so clearing localStorage is enough.
        setUser(null);
    }, []);

    useEffect(() => {
        // Restore auth state from localStorage on mount
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');
        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                // Corrupted localStorage — clear it
                clearAuth();
            }
        }
        setLoading(false);

        // Bug Fix #2 (frontend side): Listen for the 401 event dispatched by the api interceptor
        // This ensures AuthContext state is cleared when the token expires mid-session
        const handleForcedLogout = () => {
            clearAuth();
        };
        window.addEventListener('auth:logout', handleForcedLogout);
        return () => window.removeEventListener('auth:logout', handleForcedLogout);
    }, [clearAuth]);

    const login = async (email, password) => {
        const response = await api.post('/auth/login', { email, password });
        if (response.success) {
            const { token, ...userData } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        }
        return response;
    };

    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.success) {
            const { token, ...data } = response.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(data));
            setUser(data);
        }
        return response;
    };

    // Bug Fix #3: Logout now atomically clears all auth state
    const logout = () => {
        clearAuth();
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
