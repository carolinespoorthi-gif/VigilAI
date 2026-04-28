import React, { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from "jwt-decode";
import api from '../services/api';
import { logActivity } from '../services/activityLogger';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {

        let token = localStorage.getItem('token');

        if (!token) {
            token = sessionStorage.getItem('token');
        }

        if (token) {
            try {

                const decoded = jwtDecode(token);
                const currentTime = Date.now() / 1000;

                if (decoded.exp < currentTime) {
                    logout();
                } else {

                    const role =
                        localStorage.getItem('role') ||
                        sessionStorage.getItem('role');

                    setUser({
                        username: decoded.sub,
                        role: role,
                        token: token
                    });

                    api.defaults.headers.common['Authorization'] =
                        `Bearer ${token}`;
                }

            } catch {
                logout();
            }
        }

        setLoading(false);

    }, []);

    const login = async (username, password, rememberMe = false) => {

        const response = await api.post('/auth/login', { username, password });

        const { access_token, role } = response.data;

        if (rememberMe) {

            localStorage.setItem('token', access_token);
            localStorage.setItem('role', role);

        } else {

            sessionStorage.setItem('token', access_token);
            sessionStorage.setItem('role', role);

        }

        api.defaults.headers.common['Authorization'] =
            `Bearer ${access_token}`;

        const decoded = jwtDecode(access_token);

        const userObj = {
            username: decoded.sub,
            role: role,
            token: access_token
        };

        setUser(userObj);

        await logActivity(
            'login',
            `${role === 'admin' ? 'Admin' : 'User'} logged in`,
            { role },
            decoded.sub,
            role
        );

        return true;
    };

    const register = async (username, email, password, role) => {

        await api.post('/auth/register', {
            username,
            email,
            password,
            role
        });

        await logActivity(
            'register',
            `New account created: ${username}`,
            { username, role },
            username,
            role
        );

        return true;
    };

    const logout = () => {

        const username =
            localStorage.getItem('username') ||
            sessionStorage.getItem('username');

        const role =
            localStorage.getItem('role') ||
            sessionStorage.getItem('role');

        logActivity(
            'logout',
            `${role === 'admin' ? 'Admin' : 'User'} logged out`,
            { role },
            username,
            role
        );

        localStorage.removeItem('token');
        localStorage.removeItem('role');

        sessionStorage.removeItem('token');
        sessionStorage.removeItem('role');

        delete api.defaults.headers.common['Authorization'];

        setUser(null);
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                login,
                register,
                logout,
                loading
            }}
        >
            {!loading && children}
        </AuthContext.Provider>
    );
};