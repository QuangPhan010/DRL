import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { mockUsers, User } from "@/lib/mock-data";

interface AuthCtx {
  user: User | null;
  login: (username: string, password: string) => User | null;
  logout: () => void;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("drl_user");
    return raw ? JSON.parse(raw) : null;
  });

  useEffect(() => {
    if (user) localStorage.setItem("drl_user", JSON.stringify(user));
    else localStorage.removeItem("drl_user");
  }, [user]);

  const login = (username: string, password: string) => {
    const found = mockUsers.find(u => u.username === username && u.password === password);
    if (found) { setUser(found); return found; }
    return null;
  };

  const logout = () => setUser(null);

  return <Ctx.Provider value={{ user, login, logout }}>{children}</Ctx.Provider>;
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be in AuthProvider");
  return ctx;
};
