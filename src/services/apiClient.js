import axios from "axios";

// ✅ Security: Safe cookie parsing function
function getCookie(name) {
    if (typeof document === 'undefined') return null;
    
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    
    if (parts.length === 2) {
        const cookie = parts.pop().split(';').shift();
        // Validate that cookie is not empty and contains valid characters
        if (cookie && /^[\w\-_.~]+$/.test(cookie)) {
            return cookie;
        }
    }
    return null;
}

const apiClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL || '',
    withCredentials: true,
    xsrfCookieName: 'XSRF-TOKEN',
    xsrfHeaderName: 'X-XSRF-TOKEN',
    timeout: 30000, // ✅ Add timeout for security
});

apiClient.interceptors.request.use((config) => {
    // ✅ Security: Use safe cookie parsing instead of regex
    const xsrfToken = getCookie('XSRF-TOKEN');
    if (xsrfToken) {
        config.headers['X-XSRF-TOKEN'] = xsrfToken;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response ? error.response.status : null;
        const data = error.response ? error.response.data : null;
        
        // ✅ Security: Only log in development
        if (import.meta.env.DEV) {
            console.error(`Ошибка API: ${status}`, data);
        }
        return Promise.reject(error);
    }
);

export default apiClient;