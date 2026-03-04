import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI, placesAPI } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [savedPlaceIds, setSavedPlaceIds] = useState(new Set());

  const fetchSavedIds = useCallback(async () => {
    try {
      const res = await placesAPI.getSaved();
      setSavedPlaceIds(new Set(res.data.map(p => p.id)));
    } catch {
      setSavedPlaceIds(new Set());
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      authAPI.getMe()
        .then(res => { setUser(res.data); return fetchSavedIds(); })
        .catch(() => localStorage.removeItem('token'))
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [fetchSavedIds]);

  const login = async (email, password) => {
    const res = await authAPI.login(email, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    fetchSavedIds();
    return res.data.user;
  };

  const register = async (name, email, password) => {
    const res = await authAPI.register(name, email, password);
    localStorage.setItem('token', res.data.token);
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSavedPlaceIds(new Set());
  };

  const toggleSave = useCallback(async (placeId) => {
    const res = await placesAPI.toggleSave(placeId);
    setSavedPlaceIds(prev => {
      const next = new Set(prev);
      if (res.data.saved) next.add(Number(placeId));
      else next.delete(Number(placeId));
      return next;
    });
    return res.data.saved;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, loading, login, register, logout,
      isAdmin: user?.role === 'admin',
      savedPlaceIds, toggleSave,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
