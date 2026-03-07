import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Auth pages — small, loaded eagerly so login is instant
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Feature pages — code-split so initial bundle stays small
const Home          = lazy(() => import('./pages/Home'));
const Mind          = lazy(() => import('./pages/Mind'));
const Wellness      = lazy(() => import('./pages/Wellness'));
const Vault         = lazy(() => import('./pages/Vault'));
const Life          = lazy(() => import('./pages/Life'));
const Journal       = lazy(() => import('./pages/Journal'));
const Health        = lazy(() => import('./pages/Health'));
const Profile       = lazy(() => import('./pages/Profile'));
const Settings      = lazy(() => import('./pages/Settings'));
const Onboarding    = lazy(() => import('./pages/Onboarding'));
const HelpSupport   = lazy(() => import('./pages/HelpSupport'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./pages/TermsOfService'));

/** Redirect unauthenticated users: first-time visitors → /onboarding, returning → /login */
function PublicRedirect() {
  const onboarded = localStorage.getItem('lumina_onboarded');
  return <Navigate to={onboarded ? '/login' : '/onboarding'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          {/* Public onboarding — shown once to first-time visitors */}
          <Route path="/onboarding" element={<Onboarding />} />

          {/* Auth */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Public legal pages — no auth required */}
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/tos"     element={<TermsOfService />} />

          {/* Protected app routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/"         element={<Home />} />
              <Route path="/mind"     element={<Mind />} />
              <Route path="/wellness" element={<Wellness />} />
              <Route path="/vault"    element={<Vault />} />
              <Route path="/life"     element={<Life />} />
              <Route path="/journal"  element={<Journal />} />
              <Route path="/health"   element={<Health />} />
              <Route path="/profile"  element={<Profile />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/help"     element={<HelpSupport />} />
            </Route>
          </Route>

          {/* Catch-all: onboard first-timers, otherwise /login */}
          <Route path="*" element={<PublicRedirect />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
