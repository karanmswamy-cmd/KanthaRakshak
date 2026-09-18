import React, { createContext, useContext, useState } from 'react';

export interface UserProfile {
  name: string;
  role: string;
  email: string;
  department: string;
  shift: string;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  login: (email: string, role?: string) => void;
  loginAsDemo: () => void;
  logout: () => void;
}

const DEFAULT_DEMO_USER: UserProfile = {
  name: 'Sister P. Sharma',
  role: 'Staff Nurse (Neuro ICU)',
  email: 'p.sharma@hospital.org',
  department: 'Neurosciences & Stroke Unit',
  shift: 'Day Shift (08:00 - 16:00)',
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const saved = localStorage.getItem('kantha_user');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Default to demo nurse logged in for smooth hackathon review
    return DEFAULT_DEMO_USER;
  });

  const login = (email: string, role = 'Healthcare Worker / Nurse') => {
    const newUser: UserProfile = {
      name: email.split('@')[0].toUpperCase(),
      role,
      email,
      department: 'Clinical Screening Unit',
      shift: 'Current Shift',
    };
    setUser(newUser);
    try {
      localStorage.setItem('kantha_user', JSON.stringify(newUser));
    } catch (e) {}
  };

  const loginAsDemo = () => {
    setUser(DEFAULT_DEMO_USER);
    try {
      localStorage.setItem('kantha_user', JSON.stringify(DEFAULT_DEMO_USER));
    } catch (e) {}
  };

  const logout = () => {
    setUser(null);
    try {
      localStorage.removeItem('kantha_user');
    } catch (e) {}
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        loginAsDemo,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
