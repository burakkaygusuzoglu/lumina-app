import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Auth pages — small, loaded eagerly so login is instant
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Feature pages — code-split so initial bundle stays small
const Home     = lazy(() => import('./pages/Home'));
const Mind     = lazy(() => import('./pages/Mind'));
const Wellness = lazy(() => import('./pages/Wellness'));
const Vault    = lazy(() => import('./pages/Vault'));
const Life     = lazy(() => import('./pages/Life'));
const Journal  = lazy(() => import('./pages/Journal'));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<LoadingSpinner />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/mind" element={<Mind />} />
              <Route path="/wellness" element={<Wellness />} />
              <Route path="/vault" element={<Vault />} />
              <Route path="/life" element={<Life />} />
              <Route path="/journal" element={<Journal />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
