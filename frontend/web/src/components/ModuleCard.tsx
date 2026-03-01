/**
 * ModuleCard — coloured card linking to a feature module.
 */
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export interface ModuleCardProps {
  title:       string;
  subtitle:    string;
  emoji:       string;
  color:       string; /** CSS variable name e.g. 'var(--mind)' */
  colorLight:  string; /** e.g. 'var(--mind-light)' */
  path:        string;
  count?:      number;
  countLabel?: string;
}

export default function ModuleCard({
  title, subtitle, emoji, color, colorLight, path, count, countLabel,
}: ModuleCardProps) {
  const navigate = useNavigate();

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={() => navigate(path)}
      style={{
        background: colorLight,
        borderRadius: 'var(--r-lg)',
        padding: '20px',
        width: '100%',
        textAlign: 'left',
        border: `1px solid ${color}20`,
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
      }}
    >
      {/* Icon + count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{ fontSize: 32 }}>{emoji}</span>
        {count !== undefined && (
          <span
            style={{
              background: color,
              color: '#fff',
              borderRadius: 20,
              padding: '3px 10px',
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            {count} {countLabel}
          </span>
        )}
      </div>

      {/* Title */}
      <p style={{ fontSize: 17, fontWeight: 700, color: 'var(--text)' }}>{title}</p>

      {/* Subtitle */}
      <p style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.4 }}>{subtitle}</p>

      {/* Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color }}>{title} →</span>
      </div>
    </motion.button>
  );
}
