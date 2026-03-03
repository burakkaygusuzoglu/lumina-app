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
                padding:        '8px 2px',
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
                    top:          0,
                    width:        32,
                    height:       3,
                    borderRadius: '0 0 3px 3px',
                    background:   'var(--gradient)',
                  }}
                />
              )}
              <motion.span
                animate={{ scale: active ? 1.15 : 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                style={{
                  fontSize:   active ? 20 : 18,
                  opacity:    active ? 1 : 0.45,
                  lineHeight: 1,
                  filter:     active ? 'none' : 'none',
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
                  fontWeight: 700,
                  letterSpacing: '0.04em',
                  color:      active ? 'var(--mind)' : 'var(--muted)',
                  transition: 'color 0.2s',
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
