"use client";

import { createContext, useContext, useState, useCallback, useEffect } from "react";
import type { User } from "@/types";
import { mockCurrentUser } from "@/lib/mock-data";

interface AuthContextValue {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const storedUser = localStorage.getItem("gamemaster_user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch {
        localStorage.removeItem("gamemaster_user");
      }
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    // Simulate API call
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    // For demo, accept any login and use mock user
    console.log("Login attempt:", { email, password });
    
    const loggedInUser = { ...mockCurrentUser, email };
    setUser(loggedInUser);
    localStorage.setItem("gamemaster_user", JSON.stringify(loggedInUser));
    setIsLoading(false);
  }, []);

  const register = useCallback(async (email: string, username: string, password: string) => {
    // Simulate API call
    setIsLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    console.log("Register attempt:", { email, username, password });

    const newUser: User = {
      id: `user_${Date.now()}`,
      email,
      username,
      role: "MEMBER",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setUser(newUser);
    localStorage.setItem("gamemaster_user", JSON.stringify(newUser));
    setIsLoading(false);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem("gamemaster_user");
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}


