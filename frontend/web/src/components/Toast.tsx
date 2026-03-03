/**
 * Toast notification system — global, auto-dismiss, dark theme
 */
import { AnimatePresence, motion } from 'framer-motion';
import { useAppStore } from '../store/appStore';

const ICONS: Record<string, string> = {
  success: '✓',
  error:   '✕',
  info:    'ℹ',
};

const COLORS: Record<string, string> = {
  success: 'var(--wellness)',
  error:   'var(--journal)',
  info:    'var(--life)',
};

export default function Toast() {
  const { toasts, removeToast } = useAppStore();

  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{    opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: 'spring', damping: 24, stiffness: 320 }}
            onClick={() => removeToast(t.id)}
            style={{
              pointerEvents: 'all',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '12px 16px',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface2)',
              border: `1px solid ${COLORS[t.type]}40`,
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 0 1px ${COLORS[t.type]}20`,
              cursor: 'pointer',
            }}
          >
            <span
              style={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                background: `${COLORS[t.type]}22`,
                color: COLORS[t.type],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 13,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              {ICONS[t.type]}
            </span>
            <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)', flex: 1 }}>
              {t.message}
            </span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
