import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api, refreshApiAuthHeader } from '@/lib/api';
import { toSnakeCase, toCamelCase } from '@/lib/utils';
import type { User, UserProfile } from '@/types';

interface AuthConfig {
  onboarding_enabled: boolean;
  features_enabled: string[];
  max_ideas_per_user?: number;
  // Add other config fields as needed
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  config: AuthConfig | null;
  login: (email: string, password: string) => Promise<void>;
  loginWithToken: (access_token: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => void;
  updateProfile: (profileData: Partial<UserProfile>) => Promise<void>;
  getProfile: () => Promise<UserProfile | null>;
  refreshUser: () => Promise<void>;
  getUserContext: () => UserProfile | undefined;
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
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [isLoading, setIsLoading] = useState(true);
  const [config, setConfig] = useState<AuthConfig | null>(null);

  // Set up axios interceptor for authentication
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // Check if user is authenticated on mount
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const response = await api.get('/auth/me');
          setUser(response.data);
          setConfig(response.data.config || null);
        } catch (error) {
          console.error('Auth check failed:', error);
          localStorage.removeItem('token');
          setToken(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      // Use FormData for OAuth2PasswordRequestForm compatibility
      const formData = new FormData();
      formData.append('username', email); // Backend expects 'username' field
      formData.append('password', password);
      
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      const { access_token, user_id } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      refreshApiAuthHeader();
      
      // Fetch user data
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      setConfig(userResponse.data.config || null);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      throw new Error(apiError.response?.data?.detail || 'Login failed');
    }
  };

  const loginWithToken = async (access_token: string) => {
    try {
      localStorage.setItem('token', access_token);
      setToken(access_token);
      refreshApiAuthHeader();
      
      // Set the Authorization header immediately
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Fetch user data
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      setConfig(userResponse.data.config || null);
    } catch (error: unknown) {
      console.error('Token login error:', error);
      const apiError = error as { response?: { data?: { detail?: string } } };
      throw new Error(apiError.response?.data?.detail || 'Token login failed');
    }
  };

  const register = async (email: string, password: string, firstName: string, lastName: string) => {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        first_name: firstName,
        last_name: lastName
      });
      
      const { access_token, user_id } = response.data;
      
      localStorage.setItem('token', access_token);
      setToken(access_token);
      refreshApiAuthHeader();
      
      // Fetch user data
      const userResponse = await api.get('/auth/me');
      setUser(userResponse.data);
      setConfig(userResponse.data.config || null);
    } catch (error: unknown) {
      const apiError = error as { response?: { data?: { detail?: string } } };
      throw new Error(apiError.response?.data?.detail || 'Registration failed');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setConfig(null);
  };

  const updateProfile = async (profileData: Partial<UserProfile>) => {
    try {
      const response = await api.put('/auth/profile', toSnakeCase(profileData));
      setUser(prev => prev ? { ...prev, profile: toCamelCase(response.data) } : null);
      // Optionally refresh config if profile update can affect it
      const userResponse = await api.get('/auth/me');
      setConfig(userResponse.data.config || null);
    } catch (error: any) {
      throw new Error(error.response?.data?.detail || 'Profile update failed');
    }
  };

  const getProfile = async (): Promise<UserProfile | null> => {
    try {
      const response = await api.get('/auth/profile');
      setConfig(response.data.config || null);
      return toCamelCase(response.data.profile);
    } catch (error: any) {
      if (error.response?.status === 404) {
        return null;
      }
      throw new Error(error.response?.data?.detail || 'Failed to get profile');
    }
  };

  const refreshUser = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/auth/me');
      setUser(res.data);
    } catch (e) {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  };

  const getUserContext = () => {
    if (!user || !user.profile) return undefined;
    return {
      ...user.profile,
      email: user.email,
      account_type: user.account_type,
      tier: user.tier,
      id: user.id,
    };
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    config,
    login,
    loginWithToken,
    register,
    logout,
    updateProfile,
    getProfile,
    refreshUser,
    getUserContext
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 