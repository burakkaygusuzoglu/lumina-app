/**
 * Layout — wraps all authenticated pages with the bottom navigation bar.
 * Bottom nav has 5 tabs + a central FAB button.
 */
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';

/* ── Nav tab definition ──────────────────────────────────────────────────── */
interface NavTab {
  path:  string;
  emoji: string;
  label: string;
}

const LEFT_TABS: NavTab[] = [
  { path: '/',          emoji: '🏠', label: 'Home'     },
  { path: '/mind',      emoji: '🧠', label: 'Mind'     },
];

const RIGHT_TABS: NavTab[] = [
  { path: '/life',      emoji: '📅', label: 'Life'     },
  { path: '/journal',   emoji: '📖', label: 'Journal'  },
];

/* ── FAB quick-action sheet ──────────────────────────────────────────────── */
interface FabAction {
  emoji: string;
  label: string;
  path:  string;
  color: string;
}

const FAB_ACTIONS: FabAction[] = [
  { emoji: '🧠', label: 'New Memory',  path: '/mind',    color: 'var(--mind)'    },
  { emoji: '📅', label: 'New Task',    path: '/life',    color: 'var(--life)'    },
  { emoji: '💚', label: 'Log Mood',    path: '/wellness',color: 'var(--wellness)'},
  { emoji: '🔒', label: 'Add Secret',  path: '/vault',   color: 'var(--vault)'   },
  { emoji: '📖', label: 'Write Entry', path: '/journal', color: 'var(--journal)' },
];

/* ── Component ───────────────────────────────────────────────────────────── */
export default function Layout() {
  const navigate   = useNavigate();
  const location   = useLocation();
  const logout     = useAuthStore((s) => s.logout);
  const [fabOpen, setFabOpen]   = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const NavButton = ({ tab }: { tab: NavTab }) => (
    <button
      onClick={() => navigate(tab.path)}
      style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 3,
        padding: '8px 4px',
        background: 'none',
        cursor: 'pointer',
        border: 'none',
        position: 'relative',
      }}
    >
      {isActive(tab.path) && (
        <motion.div
          layoutId="nav-indicator"
          style={{
            position: 'absolute',
            top: 0,
            width: 32,
            height: 3,
            borderRadius: '0 0 4px 4px',
            background: 'var(--mind)',
          }}
        />
      )}
      <span style={{ fontSize: 22 }}>{tab.emoji}</span>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          color: isActive(tab.path) ? 'var(--mind)' : 'var(--muted)',
        }}
      >
        {tab.label}
      </span>
    </button>
  );

  return (
    <div className="app-shell">
      {/* Page content */}
      <main className="page-scroll">
        <Outlet />
      </main>

      {/* FAB overlay backdrop */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setFabOpen(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 90 }}
          />
        )}
      </AnimatePresence>

      {/* FAB action list */}
      <AnimatePresence>
        {fabOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed',
              bottom: 'calc(var(--nav-h) + 12px)',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              zIndex: 95,
              width: 200,
            }}
          >
            {FAB_ACTIONS.map((action, i) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => { setFabOpen(false); navigate(action.path); }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  background: 'var(--surface)',
                  border: 'none',
                  borderRadius: 'var(--r-lg)',
                  padding: '12px 16px',
                  cursor: 'pointer',
                  boxShadow: 'var(--shadow-md)',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    background: `${action.color}22`,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 18,
                    flexShrink: 0,
                  }}
                >
                  {action.emoji}
                </span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                  {action.label}
                </span>
              </motion.button>
            ))}

            {/* Logout at bottom of FAB */}
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.28 }}
              onClick={() => { setFabOpen(false); logout(); navigate('/login'); }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                background: 'var(--surface)',
                border: 'none',
                borderRadius: 'var(--r-lg)',
                padding: '12px 16px',
                cursor: 'pointer',
                boxShadow: 'var(--shadow-md)',
              }}
            >
              <span
                style={{
                  width: 36, height: 36,
                  background: '#fff0f0',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18, flexShrink: 0,
                }}
              >
                👋
              </span>
              <span style={{ fontSize: 14, fontWeight: 600, color: '#e05252' }}>Sign Out</span>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom navigation bar ───────────────────────────────────────── */}
      <nav
        style={{
          position: 'fixed',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '100%',
          maxWidth: 430,
          height: 'var(--nav-h)',
          background: 'var(--surface)',
          borderTop: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          paddingBottom: 'env(safe-area-inset-bottom)',
          zIndex: 80,
          boxShadow: '0 -4px 20px rgba(0,0,0,0.06)',
        }}
      >
        {/* Left tabs */}
        {LEFT_TABS.map((t) => <NavButton key={t.path} tab={t} />)}

        {/* Centre FAB */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setFabOpen((o) => !o)}
            className="fab"
            style={{
              marginTop: -28,
              transform: fabOpen ? 'rotate(45deg)' : 'rotate(0deg)',
              transition: 'transform 0.25s',
            }}
          >
            +
          </motion.button>
        </div>

        {/* Right tabs */}
        {RIGHT_TABS.map((t) => <NavButton key={t.path} tab={t} />)}

        {/* Wellness hidden tab — accessible via nav path */}
        <button
          onClick={() => navigate('/wellness')}
          style={{
            position: 'absolute',
            left: -9999,
            opacity: 0,
            pointerEvents: 'none',
          }}
        />
      </nav>
    </div>
  );
}
