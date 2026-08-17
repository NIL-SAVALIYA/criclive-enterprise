import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadUserProfile() {
      if (token) {
        try {
          const res = await api.get('/auth/profile');
          setUser(res.data.data);
        } catch (err) {
          console.error('Failed to load user profile, clearing invalid token:', err);
          logout();
        }
      }
      setLoading(false);
    }
    loadUserProfile();
  }, [token]);

  const login = async (email, password) => {
    const res = await api.post('/auth/login', { email, password });
    const { token: jwtToken, user: userData } = res.data.data;

    localStorage.setItem('token', jwtToken);
    setToken(jwtToken);
    setUser(userData);
    return userData;
  };

  const register = async (userData) => {
    const payload = {
      firstName: userData.firstName?.trim(),
      lastName: userData.lastName?.trim(),
      email: userData.email?.trim().toLowerCase(),
      password: userData.password,
      role: 'VIEWER'
    };
    const res = await api.post('/auth/register', payload);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  const refreshUserProfile = async () => {
    if (token) {
      try {
        const res = await api.get('/auth/profile');
        setUser(res.data.data);
        return res.data.data;
      } catch (err) {
        console.error('Failed to refresh user profile:', err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, hasRole, refreshUserProfile, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
