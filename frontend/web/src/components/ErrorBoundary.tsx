/**
 * ErrorBoundary — catches React render errors so a single crashed
 * component never kills the whole app.
 */
import { Component, type ReactNode, type ErrorInfo } from 'react';
import { motion } from 'framer-motion';

interface Props  { children: ReactNode; fallback?: ReactNode; }
interface State  { hasError: boolean; error: Error | null; }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console — replace with Sentry/PostHog if added later
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.fallback) return this.props.fallback;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          minHeight: '100dvh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 24px',
          textAlign: 'center',
          background: 'var(--bg)',
          maxWidth: 430,
          margin: '0 auto',
        }}
      >
        {/* Icon */}
        <motion.div
          animate={{ rotate: [0, -8, 8, -8, 0] }}
          transition={{ delay: 0.3, duration: 0.6 }}
          style={{ fontSize: 56, marginBottom: 20 }}
        >
          ⚡
        </motion.div>

        <h2 style={{
          fontSize: 22, fontWeight: 800,
          fontFamily: 'var(--font-display)', fontStyle: 'italic',
          marginBottom: 10, color: 'var(--text)',
        }}>
          Something went wrong
        </h2>
        <p style={{
          fontSize: 14, color: 'var(--muted)', lineHeight: 1.6,
          marginBottom: 28, maxWidth: 300,
        }}>
          A part of Lumina ran into an unexpected error. Your data is safe.
        </p>

        {/* Error detail (dev only) */}
        {import.meta.env.DEV && this.state.error && (
          <pre style={{
            fontSize: 11, color: 'var(--journal)',
            background: 'rgba(196,96,122,0.08)',
            border: '1px solid rgba(196,96,122,0.2)',
            borderRadius: 'var(--r-sm)',
            padding: '10px 14px',
            marginBottom: 24,
            textAlign: 'left',
            overflowX: 'auto',
            maxWidth: '100%',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}>
            {this.state.error.message}
          </pre>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button
            className="btn-primary"
            style={{ width: 'auto', padding: '12px 28px' }}
            onClick={this.reset}
          >
            Try again
          </button>
          <button
            className="btn-secondary"
            onClick={() => { window.location.href = '/'; }}
          >
            Go home
          </button>
        </div>
      </motion.div>
    );
  }
}
