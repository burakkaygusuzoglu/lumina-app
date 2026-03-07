/**
 * Layout — premium app shell with iOS-native pill bottom navigation.
 */
import { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Brain, Activity, Target, BookOpen, User } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Toast from './Toast';
import AIAssistant from './AIAssistant';

interface NavTab {
  path:  string;
  icon:  React.ComponentType<{ size?: number; strokeWidth?: number }>;
  label: string;
  color: string;
}

const TABS: NavTab[] = [
  { path: '/',        icon: Home,     label: 'Home',    color: '#7b6fda' },
  { path: '/mind',    icon: Brain,    label: 'Mind',    color: '#7b6fda' },
  { path: '/wellness',icon: Activity, label: 'Health',  color: '#3daa86' },
  { path: '/life',    icon: Target,   label: 'Life',    color: '#4a8fd4' },
  { path: '/journal', icon: BookOpen, label: 'Journal', color: '#c4607a' },
  { path: '/profile', icon: User,     label: 'Me',      color: '#e2b96a' },
];

export default function Layout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const qc        = useQueryClient();
  const isActive  = (path: string) => location.pathname === path;

  // ━━ Midnight day-transition: invalidate all queries at 00:00 local time ━━
  useEffect(() => {
    function scheduleNextMidnight() {
      const now = new Date();
      const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 5);
      const msUntil = nextMidnight.getTime() - now.getTime();
      return setTimeout(() => {
        // Invalidate every cached query so pages refresh with new-day data
        qc.invalidateQueries();
        // Reset water counter so Wellness page starts fresh
        localStorage.removeItem('water_today');
        // Re-schedule for the following midnight
        scheduleNextMidnight();
      }, msUntil);
    }
    const t = scheduleNextMidnight();
    return () => clearTimeout(t);
  }, [qc]);

  // iOS keyboard avoidance — shrink .page-scroll when virtual keyboard opens
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    function onResize() {
      const keyboardH = window.innerHeight - vv!.height;
      document.documentElement.style.setProperty(
        '--keyboard-h',
        `${Math.max(0, keyboardH)}px`,
      );
    }

    vv.addEventListener('resize', onResize);
    vv.addEventListener('scroll', onResize);
    return () => {
      vv.removeEventListener('resize', onResize);
      vv.removeEventListener('scroll', onResize);
    };
  }, []);

  function handleNav(path: string) {
    if (navigator.vibrate) navigator.vibrate(8);
    if ('startViewTransition' in document) {
      (document as Document & { startViewTransition: (cb: () => void) => void })
        .startViewTransition(() => navigate(path));
    } else {
      navigate(path);
    }
  }

  return (
    <div className="app-shell">
      <main className="page-scroll">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </main>

      <AIAssistant />
      <Toast />

      {/* Bottom navigation — iOS pill style */}
      <nav className="bottom-nav">
        {TABS.map((tab) => {
          const active  = isActive(tab.path);
          const Icon    = tab.icon;
          return (
            <button
              key={tab.path}
              onClick={() => handleNav(tab.path)}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 4,
                padding: '8px 2px 14px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {/* Pill background for active state */}
              {active && (
                <motion.div
                  layoutId="nav-pill"
                  style={{
                    position:     'absolute',
                    top:          7,
                    width:        44,
                    height:       33,
                    borderRadius: 12,
                    background:   `${tab.color}1e`,
                    border:       `1px solid ${tab.color}40`,
                    boxShadow:    `0 0 12px ${tab.color}30`,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Top aurora bar for active tab */}
              {active && (
                <motion.div
                  layoutId="nav-aurora-bar"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0,
                    width: 28,
                    height: 2,
                    borderRadius: 2,
                    background: `linear-gradient(90deg, transparent, ${tab.color}, transparent)`,
                    boxShadow: `0 0 8px ${tab.color}80`,
                  }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              )}

              {/* Icon */}
              <motion.div
                animate={{
                  scale:  active ? 1.08 : 1,
                  y:      active ? -0.5 : 0,
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 26 }}
                style={{ position: 'relative', zIndex: 1, lineHeight: 1, paddingTop: 7 }}
              >
                <span style={{
                  display: 'block',
                  color:      active ? tab.color : 'var(--muted)',
                  transition: 'color 0.2s',
                  filter:     active ? `drop-shadow(0 0 6px ${tab.color}70)` : 'none',
                  lineHeight: 0,
                }}>
                  <Icon
                    size={active ? 20 : 19}
                    strokeWidth={active ? 2.3 : 1.9}
                  />
                </span>
              </motion.div>

              {/* Label */}
              <span
                style={{
                  fontSize:      9,
                  fontWeight:    active ? 800 : 600,
                  letterSpacing: '0.04em',
                  color:         active ? tab.color : 'var(--muted)',
                  transition:    'color 0.2s, font-weight 0.1s',
                  lineHeight:    1,
                }}
              >
                {tab.label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
