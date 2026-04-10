/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  getCurrentUser,
  logout as logoutRequest,
  type AuthUser,
} from "../lib/auth";

type AuthContextType = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  setAuthenticatedUser: (user: AuthUser) => void;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function restoreSession() {
      const currentUser = await getCurrentUser();

      if (!isMounted) return;

      setUser(currentUser);
      setIsLoading(false);
    }

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, []);

  function setAuthenticatedUser(nextUser: AuthUser) {
    setUser(nextUser);
  }

  async function refreshUser() {
    const currentUser = await getCurrentUser();

    setUser(currentUser);

    return currentUser;
  }

  async function logout() {
    try {
      await logoutRequest();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        setAuthenticatedUser,
        refreshUser,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);

  if (!value) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return value;
}
