import React, { createContext, useState, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { authAPI } from '../services/api';
import socketService from '../services/socket';
import toastService from '../services/toast';

interface User {
  _id: string;
  username: string;
  email: string;
  profilePic?: string;
  isOnline?: boolean;
  bio?: string;
  phoneNumber?: string;
  location?: string;
  lastSeen?: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<{ success: boolean }>;
  register: (userData: any) => Promise<void>;
  logout: () => void;
  updateProfile: (userData: any) => Promise<void>;
  uploadProfilePic: (file: File) => Promise<void>;
  loading: boolean;
  initializing: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initializing, setInitializing] = useState(true);
  // Initialize auth on mount
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedRefreshToken = localStorage.getItem('refreshToken');
      
      if (storedToken) {
        setToken(storedToken);
        
        try {
          const response = await authAPI.getProfile();
          setUser(response.data.data.user);
          
          // Connect socket with the token
          console.log('Connecting socket with token:', storedToken.substring(0, 10) + '...');
          socketService.connect(storedToken);
          
        } catch (error: any) {
          console.error('Failed to get profile:', error);
          
          // If token is invalid, try to refresh it
          if (error.response?.status === 401 && storedRefreshToken) {
            try {
              console.log('Attempting to refresh token...');
              const refreshResponse = await authAPI.refreshToken(storedRefreshToken);
              const { token: newToken, refreshToken: newRefreshToken } = refreshResponse.data.data;
              
              // Update tokens
              localStorage.setItem('token', newToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              setToken(newToken);
              
              // Try to get profile again with new token
              const profileResponse = await authAPI.getProfile();
              setUser(profileResponse.data.data.user);
              
              // Connect socket with new token
              console.log('Connecting socket with refreshed token');
              socketService.connect(newToken);
              
            } catch (refreshError) {
              console.error('Token refresh failed:', refreshError);
              // Clear all tokens
              localStorage.removeItem('token');
              localStorage.removeItem('refreshToken');
              setToken(null);
              setUser(null);
            }
          } else {
            // Clear invalid token
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setToken(null);
            setUser(null);
            
            // Only show error if it's not a 401 (which is expected for expired tokens)
            if (error.response?.status !== 401) {
              toastService.error('Authentication failed. Please login again.');
            }
          }
        }
      }
      
      setInitializing(false);
    };

    initializeAuth();
  }, []);  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.login({ email, password });
      const { token: newToken, user: userData, refreshToken: newRefreshToken } = response.data.data;
      
      // Set tokens in localStorage first
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      
      // Then update state
      setToken(newToken);
      setUser(userData);
      
      // Connect socket immediately with the new token
      console.log('Login successful, connecting socket with token:', newToken.substring(0, 10) + '...');
      socketService.connect(newToken);
      
      toastService.success('Successfully logged in!');
      
      // Return success to indicate login is complete
      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Login failed';
      setError(errorMessage);
      toastService.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };  const register = async (userData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.register(userData);
      const { token: newToken, user: newUser, refreshToken: newRefreshToken } = response.data.data;
      
      setToken(newToken);
      setUser(newUser);
      localStorage.setItem('token', newToken);
      localStorage.setItem('refreshToken', newRefreshToken);
      socketService.connect(newToken);
      
      toastService.success('Account created successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Registration failed';
      setError(errorMessage);
      toastService.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    socketService.disconnect();
    toastService.success('Successfully logged out!');
  };const updateProfile = async (userData: any) => {
    setLoading(true);
    setError(null);
    try {
      const response = await authAPI.updateProfile(userData);
      setUser(response.data.data.user);
      toastService.success('Profile updated successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profile update failed';
      setError(errorMessage);
      toastService.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };  const uploadProfilePic = async (file: File) => {
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('profilePic', file);
      
      const response = await authAPI.uploadProfilePic(formData);
      setUser(response.data.data.user);
      toastService.success('Profile picture updated successfully!');
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Profile picture upload failed';
      setError(errorMessage);
      toastService.error(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  };
  const value = {
    user,
    token,
    login,
    register,
    logout,
    updateProfile,
    uploadProfilePic,
    loading,
    initializing,
    error
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
