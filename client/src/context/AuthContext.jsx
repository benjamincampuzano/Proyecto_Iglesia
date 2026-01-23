import { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isInitialized, setIsInitialized] = useState(true);

    useEffect(() => {
        const checkInit = async () => {
            try {
                const res = await api.get('/auth/init-status');
                setIsInitialized(res.data.isInitialized);
            } catch (error) {
                console.error('Error checking system initialization:', error);
            }
        };

        checkInit();

        const checkAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                try {
                    const res = await api.get('/users/profile');
                    if (res.data.user) {
                        setUser(res.data.user);
                        localStorage.setItem('user', JSON.stringify(res.data.user));
                    }
                } catch (error) {
                    console.error('Error fetching user profile:', error);
                    // If error is 401 or 404 (user not found/stale token), logout
                    if (error.response?.status === 401 || error.response?.status === 404) {
                        logout();
                    } else {
                        // Fallback to stored user if server fails but not 401/404
                        const storedUser = JSON.parse(localStorage.getItem('user'));
                        if (storedUser) setUser(storedUser);
                    }
                }
            }
            setLoading(false);
        };

        checkAuth();
    }, []);

    const login = async (email, password) => {
        try {
            const res = await api.post('/auth/login', { email, password });
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Login failed' };
        }
    };

    const register = async (userData) => {
        try {
            const res = await api.post('/auth/register', userData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Registration failed' };
        }
    };

    const setup = async (userData) => {
        try {
            const res = await api.post('/auth/setup', userData);
            localStorage.setItem('token', res.data.token);
            localStorage.setItem('user', JSON.stringify(res.data.user));
            setUser(res.data.user);
            setIsInitialized(true);
            return { success: true };
        } catch (error) {
            return { success: false, message: error.response?.data?.message || 'Setup failed' };
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    const updateProfile = (updatedUser) => {
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
    };

    const hasRole = (roleName) => {
        if (!user || !user.roles) return false;
        return user.roles.includes(roleName);
    };

    const hasAnyRole = (roleNames = []) => {
        if (!user || !user.roles) return false;
        return roleNames.some(role => user.roles.includes(role));
    };

    const isAdmin = () => {
        return hasAnyRole(['SUPER_ADMIN', 'PASTOR', 'LIDER_DOCE']);
    };

    const isSuperAdmin = () => {
        return hasRole('SUPER_ADMIN');
    };

    return (
        <AuthContext.Provider value={{
            user, login, register, setup, logout, updateProfile,
            loading, isInitialized,
            hasRole, hasAnyRole, isAdmin, isSuperAdmin
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
