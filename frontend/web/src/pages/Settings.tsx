import { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12, background: value ? 'var(--wellness)' : 'var(--surface2)',
        border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <motion.div
        animate={{ x: value ? 22 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
        style={{ width: 20, height: 20, borderRadius: 10, background: '#fff', position: 'absolute', top: 2 }}
      />
    </button>
  );
}

function SettingRow({ icon, label, description, end }: { icon: string; label: string; description?: string; end: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: 20, width: 28, textAlign: 'center', flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 14, fontWeight: 500 }}>{label}</p>
        {description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{description}</p>}
      </div>
      {end}
    </div>
  );
}

export default function Settings() {
  const navigate  = useNavigate();
  const addToast  = useAppStore((s) => s.addToast);

  const [notifications, setNotifications] = useState(() => localStorage.getItem('notif') !== 'false');
  const [dailyReminder, setDailyReminder] = useState(() => localStorage.getItem('daily_reminder') !== 'false');
  const [analytics,     setAnalytics]     = useState(() => localStorage.getItem('analytics') !== 'false');
  const [compactView,   setCompactView]   = useState(() => localStorage.getItem('compact') === 'true');

  function save(key: string, val: boolean) {
    localStorage.setItem(key, String(val));
    addToast('success', 'Setting saved');
  }

  const SECTIONS = [
    {
      title: 'NOTIFICATIONS',
      rows: [
        { icon: '🔔', label: 'Push Notifications', description: 'Get reminders and updates', value: notifications, onChange: (v: boolean) => { setNotifications(v); save('notif', v); } },
        { icon: '⏰', label: 'Daily Reminder', description: 'Morning journal prompt at 9 AM', value: dailyReminder, onChange: (v: boolean) => { setDailyReminder(v); save('daily_reminder', v); } },
      ],
    },
    {
      title: 'APPEARANCE',
      rows: [
        { icon: '📐', label: 'Compact View', description: 'Show more content in less space', value: compactView, onChange: (v: boolean) => { setCompactView(v); save('compact', v); } },
      ],
    },
    {
      title: 'PRIVACY',
      rows: [
        { icon: '📊', label: 'Analytics', description: 'Help improve the app', value: analytics, onChange: (v: boolean) => { setAnalytics(v); save('analytics', v); } },
      ],
    },
  ];

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => navigate(-1)} style={{ width: 36, height: 36 }}>‹</button>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Settings</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {SECTIONS.map((section) => (
          <div key={section.title} className="card">
            <p className="section-label" style={{ marginBottom: 6 }}>{section.title}</p>
            {section.rows.map((row) => (
              <SettingRow key={row.label} icon={row.icon} label={row.label} description={row.description}
                end={<Toggle value={row.value} onChange={row.onChange} />} />
            ))}
          </div>
        ))}

        {/* About */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: 6 }}>ABOUT</p>
          {[
            { icon: '📋', label: 'Privacy Policy' },
            { icon: '📄', label: 'Terms of Service' },
            { icon: '🐛', label: 'Report a Bug' },
            { icon: '⭐', label: 'Rate the App' },
          ].map((item) => (
            <button key={item.label} onClick={() => addToast('info', `${item.label} coming soon`)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'left' }}>
              <span style={{ fontSize: 18, width: 28, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
              <span style={{ color: 'var(--muted)' }}>›</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
          Lumina Life OS · v2.0.0
        </p>
      </div>
    </motion.div>
  );
}
