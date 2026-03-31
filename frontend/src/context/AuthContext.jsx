import { createContext, useContext, useState } from "react";
import { clearAuthSession, getStoredToken, getStoredUser, storeAuthSession } from "../lib/storage";
import { hydrateUserFromToken } from "../lib/jwt";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => getStoredToken());
  const [user, setUser] = useState(() => {
    const storedToken = getStoredToken();
    const storedUser = getStoredUser();
    const hydratedUser = hydrateUserFromToken(storedToken, storedUser);

    if (storedToken && hydratedUser) {
      storeAuthSession(storedToken, hydratedUser);
      return hydratedUser;
    }

    return storedUser;
  });

  function login(authResponse) {
    const normalizedUser = hydrateUserFromToken(authResponse.token, authResponse.user);
    setToken(authResponse.token);
    setUser(normalizedUser);
    storeAuthSession(authResponse.token, normalizedUser);
  }

  function logout() {
    setToken(null);
    setUser(null);
    clearAuthSession();
  }

  const value = {
    token,
    user,
    isAuthenticated: Boolean(token && user),
    login,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
