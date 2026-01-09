import { createContext, useContext, useEffect, useMemo, useState, ReactNode, useCallback } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { User, UserRole } from "@/types/canteen";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isKiosk: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; role?: UserRole }>;
  signup: (email: string, password: string, fullName: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateUser: (updates: Partial<User>) => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  requestPasswordReset: (email: string) => Promise<{ success: boolean; error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const mapRole = (role: unknown): UserRole => {
  if (role === "admin" || role === "kiosk" || role === "student") return role;
  return "student";
};

const getFullName = (sessionEmail: string | undefined, fullNameMeta: unknown) => {
  const metaName = typeof fullNameMeta === "string" ? fullNameMeta.trim() : "";
  if (metaName) return metaName;
  return (sessionEmail ?? "User").split("@")[0].replace(/[._]/g, " ");
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUserRole = useCallback(async (userId: string): Promise<UserRole> => {
    const { data, error } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) return "student";
    return mapRole(data?.role);
  }, []);

  const setFromSession = useCallback(
    async (nextSession: Session | null) => {
      setSession(nextSession);

      if (!nextSession?.user) {
        setUser(null);
        return;
      }

      const role = await fetchUserRole(nextSession.user.id);
      setUser({
        id: nextSession.user.id,
        email: nextSession.user.email ?? "",
        fullName: getFullName(nextSession.user.email, nextSession.user.user_metadata?.full_name),
        phone: typeof nextSession.user.phone === "string" && nextSession.user.phone ? nextSession.user.phone : undefined,
        role,
      });
    },
    [fetchUserRole]
  );

  // Initialize + listen for auth changes
  useEffect(() => {
    let mounted = true;

    // Listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!mounted) return;

      // Only sync state here; defer any Supabase reads to avoid deadlocks
      setSession(nextSession);

      setTimeout(() => {
        if (!mounted) return;
        setFromSession(nextSession).finally(() => setIsLoading(false));
      }, 0);
    });

    // THEN get current session
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setFromSession(data.session).finally(() => setIsLoading(false));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [setFromSession]);

  const login = useCallback(
    async (email: string, password: string) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) return { success: false, error: error.message };

        const role = data.user ? await fetchUserRole(data.user.id) : undefined;
        // navigation is handled elsewhere via onAuthStateChange
        return { success: true, role };
      } catch {
        return { success: false, error: "An unexpected error occurred" };
      } finally {
        setIsLoading(false);
      }
    },
    [fetchUserRole]
  );

  const signup = useCallback(async (email: string, password: string, fullName: string) => {
    setIsLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: fullName.trim(),
          },
        },
      });

      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);
    try {
      await supabase.auth.signOut();
      setSession(null);
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    // Local UI-only updates (Profile page). Do NOT persist roles client-side.
    setUser((prev) => {
      if (!prev) return prev;
      const next: User = { ...prev, ...updates, role: prev.role };
      return next;
    });
  }, []);

  const changePassword = useCallback(async (_currentPassword: string, newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }, []);

  const requestPasswordReset = useCallback(async (email: string) => {
    try {
      const redirectTo = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo });
      if (error) return { success: false, error: error.message };
      return { success: true };
    } catch {
      return { success: false, error: "An unexpected error occurred" };
    }
  }, []);

  const isAuthenticated = !!user;
  const isAdmin = user?.role === "admin";
  const isKiosk = user?.role === "kiosk";

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      session,
      isLoading,
      isAuthenticated,
      isAdmin,
      isKiosk,
      login,
      signup,
      logout,
      updateUser,
      changePassword,
      requestPasswordReset,
    }),
    [user, session, isLoading, isAuthenticated, isAdmin, isKiosk, login, signup, logout, updateUser, changePassword, requestPasswordReset]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
