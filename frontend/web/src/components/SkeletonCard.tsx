/**
 * SkeletonCard — standardised loading placeholder.
 * Usage:
 *   <SkeletonCard />               — default single card
 *   <SkeletonCard rows={3} />      — multiple content rows
 *   <SkeletonCard variant="list" /> — compact list row
 *   <SkeletonCard count={4} />     — renders N separate cards
 */
interface Props {
  rows?:    number;
  variant?: 'card' | 'list' | 'stat' | 'memory';
  count?:   number;
}

function Single({ rows = 2, variant = 'card' }: Omit<Props, 'count'>) {
  if (variant === 'list') {
    return (
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '14px 16px', borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="skeleton" style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 7 }}>
          <div className="skeleton skeleton-line" style={{ width: '60%' }} />
          <div className="skeleton skeleton-line sm" style={{ width: '40%' }} />
        </div>
      </div>
    );
  }

  if (variant === 'stat') {
    return (
      <div className="stat-card" style={{ flex: 1 }}>
        <div className="skeleton skeleton-line lg" style={{ width: '50%', margin: '0 auto 8px' }} />
        <div className="skeleton skeleton-line sm" style={{ width: '70%', margin: '0 auto' }} />
      </div>
    );
  }

  if (variant === 'memory') {
    return (
      <div
        style={{
          flexShrink: 0, width: 155, padding: 14, borderRadius: 16,
          background: 'var(--surface-elevated)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="skeleton skeleton-line sm" style={{ width: '60%', marginBottom: 10 }} />
        <div className="skeleton skeleton-line sm" style={{ marginBottom: 6 }} />
        <div className="skeleton skeleton-line sm" style={{ width: '80%', marginBottom: 6 }} />
        <div className="skeleton skeleton-line sm" style={{ width: '50%' }} />
      </div>
    );
  }

  return (
    <div className="skeleton-card">
      <div className="skeleton skeleton-line lg" style={{ width: '55%', marginBottom: 12 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="skeleton skeleton-line"
          style={{ width: i === rows - 1 ? '70%' : '100%', marginBottom: i < rows - 1 ? 8 : 0 }}
        />
      ))}
    </div>
  );
}

export default function SkeletonCard({ rows = 2, variant = 'card', count = 1 }: Props) {
  if (count === 1) return <Single rows={rows} variant={variant} />;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <Single key={i} rows={rows} variant={variant} />
      ))}
    </>
  );
}
