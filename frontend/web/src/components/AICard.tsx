/**
 * AICard — animated premium gradient card displaying an AI insight or pulse message.
 */
import { motion } from 'framer-motion';

interface AICardProps {
  insight:   string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function AICard({ insight, isLoading, onRefresh }: AICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #4a3fa8 0%, #7b6fda 40%, #b76088 75%, #d4607a 100%)',
        borderRadius: 'var(--r-xl)',
        padding: '22px 20px 20px',
        color: '#fff',
        minHeight: 120,
        boxShadow: '0 8px 32px rgba(123,111,218,0.35)',
      }}
    >
      {/* Background noise texture orbs */}
      <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at 80% 0%, rgba(255,255,255,0.12) 0%, transparent 60%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)', top: -60, right: -40, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 90, height: 90, borderRadius: '50%', background: 'rgba(255,255,255,0.05)', bottom: -30, left: 10, pointerEvents: 'none' }} />

      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <motion.span
            animate={{ scale: [1, 1.25, 1], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            style={{ fontSize: 17, display: 'inline-block' }}
          >
            ✨
          </motion.span>
          <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', opacity: 0.9, fontFamily: 'var(--font-display)' }}>
            AI Pulse
          </span>
          <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#5dffc8', boxShadow: '0 0 6px #5dffc8', display: 'inline-block', marginLeft: 2 }} />
        </div>
        {onRefresh && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={onRefresh}
            style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 11, fontWeight: 700, cursor: 'pointer', backdropFilter: 'blur(4px)' }}
          >
            Refresh
          </motion.button>
        )}
      </div>

      {/* Insight text */}
      <div style={{ position: 'relative' }}>
        {isLoading ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', paddingTop: 4 }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4], scale: [1, 1.3, 1] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                style={{ width: 7, height: 7, background: '#fff', borderRadius: '50%' }}
              />
            ))}
          </div>
        ) : (
          <p style={{
            fontSize: 15,
            lineHeight: 1.65,
            fontWeight: 600,
            letterSpacing: '-0.01em',
            textShadow: '0 1px 4px rgba(0,0,0,0.15)',
          }}>
            {insight}
          </p>
        )}
      </div>
    </motion.div>
  );
}
