/**
 * AICard — animated gradient card displaying an AI insight or pulse message.
 */
import { motion } from 'framer-motion';

interface AICardProps {
  insight:   string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

/* Animated gradient orbs */
const Orb = ({ style }: { style: React.CSSProperties }) => (
  <div
    style={{
      position: 'absolute',
      borderRadius: '50%',
      filter: 'blur(40px)',
      opacity: 0.35,
      ...style,
    }}
  />
);

export default function AICard({ insight, isLoading, onRefresh }: AICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      style={{
        position: 'relative',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #7b6fda 0%, #9b8fea 50%, #c4607a 100%)',
        borderRadius: 'var(--r-xl)',
        padding: '24px 20px',
        color: '#fff',
        minHeight: 130,
      }}
    >
      {/* Background orbs for depth */}
      <Orb style={{ width: 120, height: 120, background: '#fff', top: -40, right: -20 }} />
      <Orb style={{ width: 80,  height: 80,  background: '#fde8ee', bottom: -20, left: 20 }} />

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, position: 'relative' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.span
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 2.5 }}
            style={{ fontSize: 18 }}
          >
            ✨
          </motion.span>
          <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', opacity: 0.85 }}>
            AI Pulse
          </span>
        </div>
        {onRefresh && (
          <button
            onClick={onRefresh}
            style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            Refresh
          </button>
        )}
      </div>

      {/* Insight text */}
      <div style={{ position: 'relative' }}>
        {isLoading ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.4, 1, 0.4] }}
                transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
                style={{ width: 6, height: 6, background: '#fff', borderRadius: '50%' }}
              />
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 15, lineHeight: 1.6, fontWeight: 500 }}>{insight}</p>
        )}
      </div>
    </motion.div>
  );
}
