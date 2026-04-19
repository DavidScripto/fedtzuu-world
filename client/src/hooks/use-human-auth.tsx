import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiRequest } from "@/lib/queryClient";

interface HumanUser {
  id: string;
  email: string;
  subscriptionTier: string;
  paypalSubscriptionId: string | null;
  emailVerified: boolean;
  guardianOathAccepted: boolean;
  createdAt: string;
}

interface HumanAuthContextType {
  user: HumanUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<HumanUser>;
  register: (email: string, password: string) => Promise<HumanUser>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const HumanAuthContext = createContext<HumanAuthContextType | null>(null);

export function HumanAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<HumanUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch("/api/human/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (email: string, password: string): Promise<HumanUser> => {
    const res = await apiRequest("POST", "/api/human/login", { email, password });
    const data = await res.json();
    setUser(data);
    return data;
  };

  const register = async (email: string, password: string): Promise<HumanUser> => {
    const res = await apiRequest("POST", "/api/human/register", { email, password });
    const data = await res.json();
    setUser(data);
    return data;
  };

  const logout = async () => {
    await apiRequest("POST", "/api/human/logout");
    setUser(null);
  };

  return (
    <HumanAuthContext.Provider value={{ user, isLoading, login, register, logout, refreshUser }}>
      {children}
    </HumanAuthContext.Provider>
  );
}

export function useHumanAuth() {
  const context = useContext(HumanAuthContext);
  if (!context) {
    throw new Error("useHumanAuth must be used within a HumanAuthProvider");
  }
  return context;
}
