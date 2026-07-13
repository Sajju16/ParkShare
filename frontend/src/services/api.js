import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:8080/api/v1',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Interceptor for responses
api.interceptors.response.use(
    (response) => {
        return response.data; // Since our backend wraps it in ApiResponse
    },
    (error) => {
        // Global error handling
        return Promise.reject(error);
    }
);

export default api;
