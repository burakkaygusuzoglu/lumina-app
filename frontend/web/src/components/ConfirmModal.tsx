/**
 * Reusable confirmation dialog — dark premium design
 */
import { motion } from 'framer-motion';

interface Props {
  title:       string;
  message:     string;
  confirmText?: string;
  cancelText?:  string;
  danger?:      boolean;
  onConfirm:   () => void;
  onCancel:    () => void;
}

export default function ConfirmModal({
  title,
  message,
  confirmText = 'Confirm',
  cancelText  = 'Cancel',
  danger      = false,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <motion.div
      className="modal-overlay-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{    opacity: 0 }}
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <motion.div
        className="modal-sheet-center"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1,   y: 0  }}
        exit={{    opacity: 0, scale: 0.9, y: 20 }}
        transition={{ type: 'spring', damping: 24, stiffness: 320 }}
      >
        {/* Icon */}
        <div style={{ textAlign: 'center', marginBottom: 16 }}>
          <span style={{ fontSize: 40 }}>{danger ? '⚠️' : '❓'}</span>
        </div>

        <h3 style={{ fontSize: 18, fontWeight: 700, textAlign: 'center', marginBottom: 8 }}>
          {title}
        </h3>
        <p style={{ fontSize: 14, color: 'var(--text2)', textAlign: 'center', lineHeight: 1.6, marginBottom: 24 }}>
          {message}
        </p>

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ flex: 1 }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1,
              padding: '11px 20px',
              borderRadius: 'var(--r-md)',
              fontSize: 14,
              fontWeight: 700,
              fontFamily: 'var(--font)',
              background: danger ? 'rgba(196,96,122,0.15)' : 'var(--gradient)',
              color: danger ? 'var(--journal)' : '#fff',
              border: danger ? '1px solid rgba(196,96,122,0.4)' : 'none',
              cursor: 'pointer',
            }}
          >
            {confirmText}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
