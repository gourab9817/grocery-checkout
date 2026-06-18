import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api, getUserToken, setUserToken, getSavedUser, setSavedUser } from '../api/client.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authIntent, setAuthIntent] = useState(null);

  // Bootstrap: on first load, try to silently refresh from cookie
  useEffect(() => {
    if (!getUserToken() && !getSavedUser()) {
      fetch('/api/users/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (res) => {
          if (!res.ok) return;
          const json = await res.json();
          const { accessToken, ...userFields } = json.data;
          setUserToken(accessToken);
          setSavedUser(userFields);
          setUser(userFields);
        })
        .catch(() => {}); // not logged in — that's fine
    }
  }, []);

  const _applyResult = useCallback((data) => {
    const { accessToken, ...userFields } = data;
    setUserToken(accessToken);
    setSavedUser(userFields);
    setUser(userFields);
    return userFields;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const res = await api.users.login({ email, password });
    return _applyResult(res.data);
  }, [_applyResult]);

  const signup = useCallback(async ({ email, password, name }) => {
    const res = await api.users.signup({ email, password, name });
    return _applyResult(res.data);
  }, [_applyResult]);

  const logout = useCallback(async () => {
    await api.users.logout().catch(() => {});
    setUserToken(null);
    setSavedUser(null);
    setUser(null);
  }, []);

  const requireLogin = useCallback((onSuccess) => {
    if (getUserToken()) {
      onSuccess?.();
    } else {
      setAuthIntent(() => onSuccess);
      setShowAuthModal(true);
    }
  }, []);

  const handleAuthSuccess = useCallback(() => {
    setShowAuthModal(false);
    const intent = authIntent;
    setAuthIntent(null);
    intent?.();
  }, [authIntent]);

  return (
    <UserContext.Provider value={{
      user,
      login,
      signup,
      logout,
      showAuthModal,
      setShowAuthModal,
      requireLogin,
      handleAuthSuccess,
      isLoggedIn: !!user,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used inside UserProvider');
  return ctx;
}
