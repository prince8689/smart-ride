import React, { createContext, useReducer, useEffect, useCallback } from 'react';
import { getMe } from '../api/auth.api';
import { login, logout, register, verifyOTP, resendOTP } from '../api/auth.api';
import toast from '../utils/toastConfig';

export const AuthContext = createContext(null);

const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,
};

function authReducer(state, action) {
  switch (action.type) {
    case 'LOGIN':
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      };
    case 'LOGOUT':
      return { ...initialState, isLoading: false };
    case 'UPDATE_USER':
      return { ...state, user: { ...state.user, ...action.payload } };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, isLoading: false };
    default:
      return state;
  }
}

export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // On mount: restore session
  useEffect(() => {
    const restoreSession = async () => {
      const token = localStorage.getItem('sr_token');
      const userStr = localStorage.getItem('sr_user');

      if (!token || !userStr) {
        dispatch({ type: 'SET_LOADING', payload: false });
        return;
      }

      try {
        // Verify token is still valid
        const response = await getMe();
        const user = response.data;
        localStorage.setItem('sr_user', JSON.stringify(user));
        dispatch({ type: 'LOGIN', payload: { user, token } });
      } catch (error) {
        // Token invalid or expired
        localStorage.removeItem('sr_token');
        localStorage.removeItem('sr_user');
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    restoreSession();
  }, []);

  const loginUser = useCallback(async (data) => {
    try {
      const response = await login(data);
      const { access_token: token, user } = response.data;
      localStorage.setItem('sr_token', token);
      localStorage.setItem('sr_user', JSON.stringify(user));
      dispatch({ type: 'LOGIN', payload: { user, token } });
      return { success: true, role: user.role };
    } catch (error) {
      throw error;
    }
  }, []);

  const registerUser = useCallback(async (data) => {
    try {
      const response = await register(data);
      sessionStorage.setItem('sr_pending_email', data.email);
      return { success: true, message: response.message };
    } catch (error) {
      throw error;
    }
  }, []);

  const verifyOTPUser = useCallback(async (data) => {
    try {
      await verifyOTP(data);
      sessionStorage.removeItem('sr_pending_email');
      return { success: true };
    } catch (error) {
      throw error;
    }
  }, []);

  const logoutUser = useCallback(async () => {
    try { await logout(); } catch (e) { /* ignore */ }
    localStorage.removeItem('sr_token');
    localStorage.removeItem('sr_user');
    sessionStorage.clear();
    dispatch({ type: 'LOGOUT' });
  }, []);

  const updateUser = useCallback((userData) => {
    dispatch({ type: 'UPDATE_USER', payload: userData });
    const current = JSON.parse(localStorage.getItem('sr_user') || '{}');
    localStorage.setItem('sr_user', JSON.stringify({ ...current, ...userData }));
  }, []);

  return (
    <AuthContext.Provider value={{
      ...state,
      loginUser,
      registerUser,
      verifyOTPUser,
      logoutUser,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
}
