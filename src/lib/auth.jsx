import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getSupabase } from './supabase.js';
import { api } from './api.js';
import { setActiveAccountId, getActiveAccountId } from './api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeAccount, setActiveAccountState] = useState(getActiveAccountId());

  function switchAccount(accountId) {
    setActiveAccountId(accountId);
    setActiveAccountState(accountId);
    // Re-fetch user to update role for new account context
    api.getUser().then(setUser).catch(console.error);
  }

  useEffect(() => {
    let sub;
    (async () => {
      const sb = getSupabase();
      const { data: { session } } = await sb.auth.getSession();
      if (session) {
        try {
          const u = await api.getUser();
          setUser(u);
          // If no active account set, default to own
          if (!getActiveAccountId() && u?.id) {
            setActiveAccountId(u.id);
            setActiveAccountState(u.id);
          }
        } catch { /* keep null */ }
      }
      setLoading(false);

      const { data: { subscription } } = sb.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setActiveAccountId(null);
          setActiveAccountState(null);
          return;
        }
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
          try { setUser(await api.getUser()); } catch { /* keep current user */ }
        }
      });
      sub = subscription;
    })();
    return () => sub?.unsubscribe();
  }, []);

  const signIn = useCallback(async () => {
    const sb = getSupabase();
    if (!sb) return;
    await sb.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/auth/callback',
        scopes: 'openid email profile https://www.googleapis.com/auth/drive.file',
        queryParams: { access_type: 'offline', prompt: 'consent' },
      },
    });
  }, []);

  const signOut = useCallback(async () => {
    setUser(null);
    setActiveAccountId(null);
    setActiveAccountState(null);
    try {
      const sb = getSupabase();
      if (sb) await sb.auth.signOut();
    } catch (e) {
      console.error('signOut error:', e);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut, activeAccount, switchAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
