import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor: always attach the freshest token from localStorage
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor: unwrap our ApiResponse wrapper, handle 401 globally
api.interceptors.response.use(
    (response) => {
        // Unwrap the ApiResponse envelope from the backend
        return response.data;
    },
    (error) => {
        // Log the full error for debugging
        if (error.response) {
            console.error('[API Error]', {
                url: error.config?.url,
                status: error.response.status,
                data: error.response.data,
            });

            // Bug Fix #2: If we get a 401 (expired/invalid token), force logout
            if (error.response.status === 401) {
                const currentPath = window.location.pathname;
                // Don't redirect if already on auth pages
                if (currentPath !== '/login' && currentPath !== '/register') {
                    localStorage.removeItem('token');
                    localStorage.removeItem('user');
                    delete api.defaults.headers.common['Authorization'];
                    // Dispatch a custom event so AuthContext can react
                    window.dispatchEvent(new CustomEvent('auth:logout'));
                }
            }
        } else {
            console.error('[API Network Error]', error.message);
        }
        return Promise.reject(error);
    }
);

export default api;
