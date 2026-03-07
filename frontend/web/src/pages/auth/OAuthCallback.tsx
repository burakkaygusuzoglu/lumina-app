/**
 * OAuthCallback — handles Supabase OAuth redirect (Google etc.)
 * Supabase appends #access_token=... to the URL after OAuth redirect.
 * We extract the token, store it, and redirect to the main app.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/authStore';
import { api } from '../../lib/api';

export default function OAuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuthStore();
  const [error, setError] = useState('');

  useEffect(() => {
    async function handleCallback() {
      // Supabase puts tokens in the URL hash
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', '?'));
      const accessToken = params.get('access_token');

      if (!accessToken) {
        setError('No access token found. Please try signing in again.');
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Store in localStorage for the api interceptor
      localStorage.setItem('lumina_token', accessToken);

      try {
        // Fetch the user profile using the new token
        const { data } = await api.get('/auth/me');
        setUser(data);
        // Also persist token in zustand store
        useAuthStore.setState({ token: accessToken });
        navigate('/', { replace: true });
      } catch {
        setError('Failed to load your profile. Please sign in again.');
        localStorage.removeItem('lumina_token');
        setTimeout(() => navigate('/login'), 3000);
      }
    }

    handleCallback();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) {
    return (
      <div style={{
        minHeight: '100dvh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'var(--bg)',
      }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>⚠️</div>
        <p style={{ color: 'var(--journal)', fontWeight: 600, textAlign: 'center', fontSize: 15 }}>
          {error}
        </p>
        <p style={{ color: 'var(--muted)', fontSize: 13, marginTop: 8 }}>
          Redirecting to login…
        </p>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100dvh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', gap: 20,
    }}>
      {/* Animated aurora orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div className="orb orb-mind"     style={{ top: '10%',  left: '-10%',  width: '55%', height: '55%' }} />
        <div className="orb orb-wellness" style={{ bottom: '10%', right: '-10%', width: '50%', height: '50%' }} />
      </div>

      <motion.div
        animate={{ rotate: [0, 360] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
        style={{
          width: 60, height: 60,
          borderRadius: '50%',
          border: '3px solid transparent',
          borderTop: '3px solid #7b6fda',
          borderRight: '3px solid #3daa86',
          position: 'relative', zIndex: 1,
        }}
      />
      <p style={{
        color: 'var(--text2)', fontSize: 15, fontWeight: 600,
        position: 'relative', zIndex: 1,
      }}>
        Signing you in…
      </p>
    </div>
  );
}
