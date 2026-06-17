import { createContext, useContext, useState, useCallback } from 'react';
import { api, getUserToken, setUserToken, getSavedUser, setSavedUser } from '../api/client.js';

const UserContext = createContext(null);

export function UserProvider({ children }) {
  const [user, setUser] = useState(getSavedUser);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authIntent, setAuthIntent] = useState(null); // callback to run after login

  const login = useCallback(async ({ email, password }) => {
    const res = await api.users.login({ email, password });
    setUserToken(res.data.token);
    setSavedUser(res.data);
    setUser(res.data);
    return res.data;
  }, []);

  const signup = useCallback(async ({ email, password, name }) => {
    const res = await api.users.signup({ email, password, name });
    setUserToken(res.data.token);
    setSavedUser(res.data);
    setUser(res.data);
    return res.data;
  }, []);

  const logout = useCallback(() => {
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
