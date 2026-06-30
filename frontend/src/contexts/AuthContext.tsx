import { createContext, useContext, useState, ReactNode, useEffect } from "react";
import { User } from "@/lib/mock-data";
import { toast } from "sonner";

export const API_URL = "http://127.0.0.1:8000/api";

interface LoginResult {
  user: User | null;
  isFirstLogin: boolean;
  isInactive: boolean;
}

interface AuthCtx {
  user: User | null;
  allUsers: User[];
  login: (username: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  updateUserPassword: (username: string, newPass: string) => Promise<void>;
  setAllUsers: React.Dispatch<React.SetStateAction<User[]>>;
  fetchUsers: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem("drl_user");
    return raw ? JSON.parse(raw) : null;
  });

  const [allUsers, setAllUsers] = useState<User[]>([]);

  useEffect(() => {
    if (user) {
      localStorage.setItem("drl_user", JSON.stringify(user));
      // MockTokenAuthentication uses a deterministic token. Restore it for
      // sessions created before token persistence was added.
      if (!localStorage.getItem("drl_token") && user.username) {
        localStorage.setItem("drl_token", `mock-token-for-${user.username}`);
      }
      fetchUsers();
    } else {
      localStorage.removeItem("drl_user");
      localStorage.removeItem("drl_token");
    }
  }, [user]);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("drl_token");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`; // or token directly
      }
      const res = await fetch(`${API_URL}/users/`, { headers });
      if (res.ok) {
        const data = await res.json();
        const mapped: User[] = data.map((u: any) => ({
          id: u.id.toString(),
          username: u.username,
          password: "",
          fullName: u.full_name,
          email: u.email,
          role: u.role,
          roles: u.roles || [u.role],
          studentId: u.student_id,
          isFirstLogin: u.is_first_login,
          isActive: u.is_active,
          organizations: u.organizations || []
        }));
        setAllUsers(mapped);
      }
    } catch (err) {
      console.error("Lỗi lấy danh sách tài khoản:", err);
    }
  };

  const login = async (username: string, password: string): Promise<LoginResult> => {
    try {
      const res = await fetch(`${API_URL}/login/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      
      if (!res.ok) {
        if (res.status === 403) {
          return { user: null, isFirstLogin: false, isInactive: true };
        }
        return { user: null, isFirstLogin: false, isInactive: false };
      }
      
      const data = await res.json();
      const mappedUser: User = {
        id: data.user.id.toString(),
        username: data.user.username,
        password: "",
        fullName: data.user.full_name,
        email: data.user.email,
        role: data.user.role,
        roles: data.user.roles || [data.user.role],
        studentId: data.user.student_id,
        isFirstLogin: data.is_first_login,
        isActive: true,
        organizations: data.user.organizations || []
      };

      localStorage.setItem("drl_token", data.token);

      if (data.is_first_login) {
        return { user: mappedUser, isFirstLogin: true, isInactive: false };
      }

      setUser(mappedUser);
      return { user: mappedUser, isFirstLogin: false, isInactive: false };
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ backend");
      return { user: null, isFirstLogin: false, isInactive: false };
    }
  };

  const logout = () => {
    setUser(null);
  };

  const updateUserPassword = async (username: string, newPass: string) => {
    try {
      const res = await fetch(`${API_URL}/change-password/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password: newPass })
      });
      if (res.ok) {
        const data = await res.json();
        const mappedUser: User = {
          id: data.user.id.toString(),
          username: data.user.username,
          password: "",
          fullName: data.user.full_name,
          email: data.user.email,
          role: data.user.role,
          roles: data.user.roles || [data.user.role],
          studentId: data.user.student_id,
          isFirstLogin: false,
          isActive: true,
          organizations: data.user.organizations || []
        };
        setUser(mappedUser);
      } else {
        toast.error("Không thể thay đổi mật khẩu");
      }
    } catch (err) {
      console.error(err);
      toast.error("Lỗi kết nối máy chủ");
    }
  };

  return (
    <Ctx.Provider value={{ user, allUsers, login, logout, updateUserPassword, setAllUsers, fetchUsers }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be in AuthProvider");
  return ctx;
};
