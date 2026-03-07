/**
 * Layout — premium app shell with iOS-native pill bottom navigation.
 */
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Brain, Activity, Target, BookOpen, User } from 'lucide-react';
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
  const isActive  = (path: string) => location.pathname === path;

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
                    width:        42,
                    height:       32,
                    borderRadius: 11,
                    background:   `${tab.color}22`,
                    border:       `1px solid ${tab.color}35`,
                  }}
                  transition={{ type: 'spring', stiffness: 460, damping: 28 }}
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
