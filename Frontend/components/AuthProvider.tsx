"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  clearAuthSession,
  getStoredEmail,
  getStoredToken,
  saveAuthSession,
  subscribeToAuth,
} from "@/lib/authStorage";
import {
  requestCurrentUser,
  requestLogin,
  type CurrentUser,
} from "@/services/authService";

type AuthContextValue = {
  email: string | null;
  isAuthenticated: boolean;
  isProfileLoading: boolean;
  isReady: boolean;
  profileError: string | null;
  refreshUser: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  user: CurrentUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

type AuthSession = {
  email: string | null;
  token: string | null;
};

const EMPTY_SESSION: AuthSession = { email: null, token: null };

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [session, setSession] = useState<AuthSession>(EMPTY_SESSION);
  const [user, setUser] = useState<CurrentUser | null>(null);
  const sessionTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const syncSession = () => {
      const token = getStoredToken();
      const tokenChanged = token !== sessionTokenRef.current;
      sessionTokenRef.current = token;
      setSession({ email: token ? getStoredEmail() : null, token });
      if (tokenChanged) {
        setUser(null);
        setProfileError(null);
        setIsProfileLoading(Boolean(token));
      }
    };

    // Browser storage is unavailable during server rendering, so the first
    // session read intentionally happens once the component is hydrated.
    syncSession();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsReady(true);

    return subscribeToAuth(syncSession);
  }, []);

  const refreshUser = useCallback(async () => {
    if (!getStoredToken()) {
      setUser(null);
      setProfileError(null);
      return;
    }

    setIsProfileLoading(true);
    setProfileError(null);
    try {
      const nextUser = await requestCurrentUser();
      setUser(nextUser);
      setSession((currentSession) => ({
        ...currentSession,
        email: nextUser.email,
      }));
    } catch {
      setUser(null);
      setProfileError("We could not load your traveler profile. Please try again.");
    } finally {
      setIsProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady || !session.token) return;
    let isCurrent = true;

    requestCurrentUser()
      .then((nextUser) => {
        if (!isCurrent) return;
        setUser(nextUser);
        setSession((currentSession) => ({
          ...currentSession,
          email: nextUser.email,
        }));
        setProfileError(null);
      })
      .catch(() => {
        if (!isCurrent) return;
        setUser(null);
        setProfileError("We could not load your traveler profile. Please try again.");
      })
      .finally(() => {
        if (isCurrent) setIsProfileLoading(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [isReady, session.token]);

  const login = useCallback(async (nextEmail: string, password: string) => {
    const response = await requestLogin({ email: nextEmail, password });
    saveAuthSession(response.access_token, nextEmail);
    setSession({
      email: nextEmail.trim().toLowerCase(),
      token: response.access_token,
    });
  }, []);

  const logout = useCallback(() => {
    clearAuthSession();
    setSession(EMPTY_SESSION);
    setUser(null);
    setProfileError(null);
    setIsProfileLoading(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      email: session.email,
      isAuthenticated: Boolean(session.token),
      isProfileLoading,
      isReady,
      profileError,
      refreshUser,
      login,
      logout,
      user,
    }),
    [
      isProfileLoading,
      isReady,
      login,
      logout,
      profileError,
      refreshUser,
      session.email,
      session.token,
      user,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
