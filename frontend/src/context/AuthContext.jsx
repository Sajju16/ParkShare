import React, { createContext, useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    // Centralized logout & cleanup logic: operates strictly on the tab-scoped sessionStorage
    const clearAuth = useCallback(() => {
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        // Scrub legacy localStorage keys if present to avoid cross-tab storage pollution
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    }, []);

    useEffect(() => {
        // Scrub any old legacy localStorage items
        localStorage.removeItem('token');
        localStorage.removeItem('user');

        // Restore auth state from tab-scoped sessionStorage on mount
        const storedUser = sessionStorage.getItem('user');
        const token = sessionStorage.getItem('token');
        if (storedUser && token) {
            try {
                setUser(JSON.parse(storedUser));
            } catch {
                // Corrupted sessionStorage — clear it
                clearAuth();
            }
        }
        setLoading(false);

        // Listen for the 401 event dispatched by api.js request/response interceptor
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
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(userData));
            setUser(userData);
        }
        return response;
    };

    const register = async (userData) => {
        const response = await api.post('/auth/register', userData);
        if (response.success) {
            const { token, ...data } = response.data;
            sessionStorage.setItem('token', token);
            sessionStorage.setItem('user', JSON.stringify(data));
            setUser(data);
        }
        return response;
    };

    const logout = () => {
        clearAuth();
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
