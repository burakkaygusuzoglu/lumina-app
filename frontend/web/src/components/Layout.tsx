/**
 * Layout  dark premium bottom navigation with 6 tabs.
 * Tabs: Home | Mind | AI | Life | Journal | Profile
 */
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, Brain, Activity, Target, BookOpen, User } from 'lucide-react';
import Toast from './Toast';
import AIAssistant from './AIAssistant';

interface NavTab {
  path:  string;
  icon:  React.ReactNode;
  label: string;
}

const TABS: NavTab[] = [
  { path: '/',        icon: <Home size={22} />,     label: 'Home'    },
  { path: '/mind',    icon: <Brain size={22} />,    label: 'Mind'    },
  { path: '/wellness',icon: <Activity size={22} />, label: 'Health'  },
  { path: '/life',    icon: <Target size={22} />,   label: 'Life'    },
  { path: '/journal', icon: <BookOpen size={22} />, label: 'Journal' },
  { path: '/profile', icon: <User size={22} />,     label: 'Profile' },
];

export default function Layout() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const isActive  = (path: string) => location.pathname === path;

  return (
    <div className="app-shell">
      <main className="page-scroll">
        <AnimatePresence mode="wait">
          <Outlet />
        </AnimatePresence>
      </main>

      {/* Global AI assistant floating button + chat */}
      <AIAssistant />

      {/* Global toasts */}
      <Toast />

      {/* Bottom navigation */}
      <nav className="bottom-nav">
        {TABS.map((tab) => {
          const active = isActive(tab.path);
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              style={{
                flex:           1,
                display:        'flex',
                flexDirection:  'column',
                alignItems:     'center',
                gap:            3,
                padding:        '8px 2px 10px',
                background:     'none',
                border:         'none',
                cursor:         'pointer',
                position:       'relative',
              }}
            >
              {active && (
                <motion.div
                  layoutId="nav-active"
                  style={{
                    position:     'absolute',
                    bottom:       6,
                    width:        20,
                    height:       3,
                    borderRadius: '3px 3px 0 0',
                    background:   'var(--gradient)',
                    boxShadow:    '0 0 8px rgba(123,111,218,0.6)',
                  }}
                />
              )}
              <motion.span
                animate={{ scale: active ? 1.18 : 1, y: active ? -1 : 0 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22 }}
                style={{
                  fontSize:   active ? 21 : 19,
                  opacity:    active ? 1 : 0.42,
                  lineHeight: 1,
                  background: active ? 'var(--gradient)' : 'none',
                  WebkitBackgroundClip: active ? 'text' : 'unset',
                  WebkitTextFillColor: active ? 'transparent' : 'var(--muted)',
                  backgroundClip: active ? 'text' : 'unset',
                }}
              >
                {tab.icon}
              </motion.span>
              <span
                style={{
                  fontSize:   9,
                  fontWeight: 800,
                  letterSpacing: '0.05em',
                  color:      active ? 'var(--mind)' : 'var(--muted)',
                  transition: 'color 0.2s',
                  opacity:    active ? 1 : 0.65,
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
