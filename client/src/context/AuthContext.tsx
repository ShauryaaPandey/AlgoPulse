import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { api } from '../lib/api';

interface User {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface ConnectedProfile {
  id: string;
  platform: string;
  username: string;
  profile_url: string | null;
  connected_at: string;
  last_verified_at: string | null;
}

interface AuthContextType {
  user: User | null;
  connectedProfiles: ConnectedProfile[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [connectedProfiles, setConnectedProfiles] = useState<ConnectedProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUser = async () => {
    try {
      const response = await api.get<{ user: User; connectedProfiles: ConnectedProfile[] }>('/auth/me');
      setUser(response.data.user);
      setConnectedProfiles(response.data.connectedProfiles);
    } catch {
      setUser(null);
      setConnectedProfiles([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await api.post<{ user: User }>('/auth/login', { email, password });
    setUser(response.data.user);
    await fetchUser();
  };

  const signup = async (name: string, email: string, password: string) => {
    const response = await api.post<{ user: User }>('/auth/signup', { name, email, password });
    setUser(response.data.user);
    await fetchUser();
  };

  const logout = async () => {
    await api.post('/auth/logout');
    setUser(null);
    setConnectedProfiles([]);
  };

  const value = {
    user,
    connectedProfiles,
    isLoading,
    isAuthenticated: !!user,
    login,
    signup,
    logout,
    refetch: fetchUser
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
