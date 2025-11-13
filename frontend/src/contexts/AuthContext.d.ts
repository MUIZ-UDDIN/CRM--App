// Type definitions for AuthContext
import * as React from 'react';

export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  permissions: string[];
  company_id?: string;
  team_id?: string;
  avatar?: string;
  status: string;
  [key: string]: any; // For any additional properties
}

export interface LoginResult {
  access_token: string;
  token_type: string;
  user: any;
}

export interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  loadUser: () => Promise<User | void>;
  clearError: () => void;
}

export interface AuthProviderProps {
  children: React.ReactNode;
}
