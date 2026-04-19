import { useEffect } from 'react';
import { getSupabase } from '../lib/supabase.js';
import { api } from '../lib/api.js';

export default function AuthCallback() {
  useEffect(() => {
    (async () => {
      try {
        const sb = getSupabase();
        if (!sb) { window.location.replace('/dashboard'); return; }

        // With PKCE flow + detectSessionInUrl (default true),
        // Supabase auto-exchanges the ?code= during client init.
        // getSession() waits for that to finish.
        const { data: { session } } = await sb.auth.getSession();

        if (!session) {
          console.error('No session after auth callback');
          window.location.replace('/sign-in');
          return;
        }

        // Persist Google provider tokens for Drive API
        if (session.provider_token) {
          try {
            await api.saveTokens(session.provider_token, session.provider_refresh_token);
          } catch (e) {
            console.error('Failed to save provider tokens:', e);
          }
        }

        window.location.replace('/dashboard');
      } catch (err) {
        console.error('Auth callback error:', err);
        window.location.replace('/sign-in');
      }
    })();
  }, []);

  return (
    <div className="loading-page">
      <div className="spinner" />
    </div>
  );
}
