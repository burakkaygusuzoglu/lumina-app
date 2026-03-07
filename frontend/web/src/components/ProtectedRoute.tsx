/**
 * ProtectedRoute — redirects unauthenticated users.
 * First-time visitors (no 'lumina_onboarded' flag) → /onboarding
 * Returning visitors → /login
 */
import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';

export default function ProtectedRoute() {
  const token = useAuthStore((s) => s.token);
  if (token) return <Outlet />;
  const onboarded = localStorage.getItem('lumina_onboarded');
  return <Navigate to={onboarded ? '/login' : '/onboarding'} replace />;
}
