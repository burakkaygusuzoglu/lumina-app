/**
 * AICard — premium animated Aurora gradient banner for AI insights.
 */
import { motion } from 'framer-motion';

interface AICardProps {
  insight:    string;
  isLoading?: boolean;
  onRefresh?: () => void;
}

export default function AICard({ insight, isLoading, onRefresh }: AICardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1,  y: 0,  scale: 1 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position:     'relative',
        overflow:     'hidden',
        borderRadius: 'var(--r-xl)',
        padding:      '22px 20px 20px',
        color:        '#fff',
        minHeight:    116,
        background:
          'linear-gradient(128deg, #352b9e 0%, #6b3fa8 30%, #9b3f80 58%, #c94b72 82%, #e05c4a 100%)',
        boxShadow:
          '0 8px 36px rgba(107,63,168,0.45), 0 2px 0 rgba(255,255,255,0.08) inset',
        border: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      {/* Shine highlight */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'radial-gradient(ellipse 75% 55% at 15% -10%, rgba(255,255,255,0.18) 0%, transparent 60%)',
        pointerEvents: 'none',
      }} />

      {/* Pulsing aurora orbs */}
      <motion.div
        animate={{ scale: [1, 1.25, 1], opacity: [0.25, 0.4, 0.25] }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut' }}
        style={{
          position: 'absolute', width: 220, height: 220, borderRadius: '50%',
          background: 'rgba(123,111,218,0.3)', top: -90, right: -60,
          filter: 'blur(50px)', pointerEvents: 'none',
        }}
      />
      <motion.div
        animate={{ scale: [1, 1.15, 1], opacity: [0.2, 0.32, 0.2] }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 1.5 }}
        style={{
          position: 'absolute', width: 160, height: 160, borderRadius: '50%',
          background: 'rgba(61,170,134,0.25)', bottom: -70, left: -30,
          filter: 'blur(40px)', pointerEvents: 'none',
        }}
      />

      {/* Header row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: 11, position: 'relative',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <motion.span
            animate={{ rotate: [0, 15, -15, 0], scale: [1, 1.2, 1] }}
            transition={{ repeat: Infinity, duration: 3.5, ease: 'easeInOut' }}
            style={{ fontSize: 16, display: 'inline-block', lineHeight: 1 }}
          >
            ✦
          </motion.span>
          <span style={{
            fontSize: 10, fontWeight: 800, letterSpacing: '0.14em',
            textTransform: 'uppercase', opacity: 0.92,
          }}>
            Lumina AI
          </span>
          <motion.span
            animate={{ opacity: [1, 0.3, 1], scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
            style={{
              display: 'inline-block', width: 5, height: 5, borderRadius: '50%',
              background: '#5dffc8', boxShadow: '0 0 6px #5dffc8',
            }}
          />
        </div>
        {onRefresh && (
          <motion.button
            whileTap={{ scale: 0.88 }}
            onClick={onRefresh}
            style={{
              background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.22)',
              color: '#fff', borderRadius: 20, padding: '5px 13px',
              fontSize: 11, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.02em',
            }}
          >
            Refresh
          </motion.button>
        )}
      </div>

      {/* Insight text */}
      <div style={{ position: 'relative' }}>
        {isLoading ? (
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', paddingTop: 6 }}>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{ opacity: [0.35, 1, 0.35], y: [0, -4, 0] }}
                transition={{ repeat: Infinity, duration: 1.4, delay: i * 0.22 }}
                style={{ width: 7, height: 7, background: 'rgba(255,255,255,0.9)', borderRadius: '50%' }}
              />
            ))}
          </div>
        ) : (
          <p style={{
            fontSize: 15, lineHeight: 1.6, fontWeight: 600,
            letterSpacing: '-0.01em', textShadow: '0 1px 6px rgba(0,0,0,0.25)',
          }}>
            {insight}
          </p>
        )}
      </div>
    </motion.div>
  );
}
