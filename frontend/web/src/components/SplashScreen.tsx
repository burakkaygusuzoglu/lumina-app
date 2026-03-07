/**
 * SplashScreen — Instagram-quality animated launch screen.
 * Shows for ~1.8 s then fades out, calling `onDone` once complete.
 */
import { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface Props {
  visible: boolean;
  onDone: () => void;
}

export default function SplashScreen({ visible, onDone }: Props) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(onDone, 1900);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onDone]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="splash"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.48, ease: [0.4, 0, 0.2, 1] }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0a0a0f',
            overflow: 'hidden',
          }}
        >
          {/* Aurora orbs — identical to Instagram gradient splash */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.55, 0.75, 0.55] }}
            transition={{ repeat: Infinity, duration: 3.2, ease: 'easeInOut' }}
            style={{
              position: 'absolute',
              top: '-10%',
              left: '-10%',
              width: '60%',
              height: '60%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(123,111,218,0.48) 0%, transparent 70%)',
              filter: 'blur(60px)',
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.2, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut', delay: 0.8 }}
            style={{
              position: 'absolute',
              bottom: '-5%',
              right: '-15%',
              width: '65%',
              height: '65%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(61,170,134,0.38) 0%, transparent 70%)',
              filter: 'blur(70px)',
            }}
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
            transition={{ repeat: Infinity, duration: 3.6, ease: 'easeInOut', delay: 1.4 }}
            style={{
              position: 'absolute',
              top: '40%',
              right: '-5%',
              width: '45%',
              height: '45%',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(196,96,122,0.32) 0%, transparent 70%)',
              filter: 'blur(55px)',
            }}
          />

          {/* Logo orb */}
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.65, ease: [0.34, 1.56, 0.64, 1] }}
            style={{ position: 'relative', zIndex: 2, marginBottom: 28 }}
          >
            <motion.div
              animate={{ rotate: [0, 6, -6, 0] }}
              transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
              style={{
                width: 96,
                height: 96,
                borderRadius: 32,
                background: 'linear-gradient(135deg, #7b6fda 0%, #b76088 50%, #3daa86 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 46,
                boxShadow:
                  '0 0 0 1px rgba(255,255,255,0.12), 0 0 60px rgba(123,111,218,0.6), 0 0 120px rgba(61,170,134,0.3)',
              }}
            >
              ✦
            </motion.div>
          </motion.div>

          {/* App name */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.25, ease: 'easeOut' }}
            style={{ position: 'relative', zIndex: 2, textAlign: 'center' }}
          >
            <h1
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: '-0.02em',
                color: '#f0f0ff',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
                marginBottom: 6,
              }}
            >
              Lumina
            </h1>
            <p
              style={{
                fontSize: 13,
                fontWeight: 500,
                letterSpacing: '0.12em',
                color: 'rgba(152,152,184,0.8)',
                textTransform: 'uppercase',
                fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif",
              }}
            >
              Life Operating System
            </p>
          </motion.div>

          {/* Loading bar — Apple-style thin progress line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            style={{
              position: 'absolute',
              bottom: '12%',
              left: '50%',
              transform: 'translateX(-50%)',
              width: 120,
              height: 2,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.08)',
              overflow: 'hidden',
              zIndex: 2,
            }}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, delay: 0.3, ease: [0.4, 0, 0.6, 1], repeat: 0 }}
              style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(90deg, transparent 0%, rgba(123,111,218,0.9) 40%, rgba(61,170,134,0.9) 60%, transparent 100%)',
                borderRadius: 2,
              }}
            />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
