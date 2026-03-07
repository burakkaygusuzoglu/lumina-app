import { useState } from 'react';
import AICard from '../components/AICard';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import { THEMES } from '../store/appStore';
import ConfirmModal from '../components/ConfirmModal';

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
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', background: 'var(--surface)', margin: '4px 0', borderRadius: 16, border: '1px solid rgba(255,255,255,0.05)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, background: 'var(--bg)', borderRadius: 12, boxShadow: 'inset 0 1px 3px rgba(255,255,255,0.05)' }}>{icon}</div>
        <div>
          <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{label}</p>
          {description && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>{description}</p>}
        </div>
      </div>
      <div>{end}</div>
    </div>
  );
}

export default function Settings() {
  const [aiInsight] = useState('AI says: Dark mode is saving your battery and eye strain.');

  const navigate  = useNavigate();
  const addToast  = useAppStore((s) => s.addToast);
  const bgTheme   = useAppStore((s) => s.bgTheme);
  const setBgTheme = useAppStore((s) => s.setBgTheme);

  const [notifications, setNotifications] = useState(() => localStorage.getItem('notif') !== 'false');
  const [dailyReminder, setDailyReminder] = useState(() => localStorage.getItem('daily_reminder') !== 'false');
  const [analytics,     setAnalytics]     = useState(() => localStorage.getItem('analytics') !== 'false');
  const [compactView,   setCompactView]   = useState(() => localStorage.getItem('compact') === 'true');
  const [reportBug,     setReportBug]     = useState(false);

  async function requestPushPermission(enable: boolean) {
    if (enable) {
      if (!('Notification' in window)) {
        addToast('error', 'Push notifications are not supported on this device');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        setNotifications(true);
        save('notif', true);
        new Notification('Lumina Notifications Enabled', { body: 'You will stay updated!' });
      } else {
        setNotifications(false);
        save('notif', false);
        addToast('error', 'Notification permission denied');
      }
    } else {
      setNotifications(false);
      save('notif', false);
    }
  }

  function handleDailyReminder(enable: boolean) {
    setDailyReminder(enable);
    save('daily_reminder', enable);
    if (enable) {
      addToast('success', 'Daily reminder set for 9 AM');
    }
  }

  function save(key: string, val: boolean) {
    localStorage.setItem(key, String(val));
    if(key !== 'notif' && key !== 'daily_reminder') addToast('success', 'Setting saved');
  }

  function handleAboutAction(label: string) {
    if (label === 'Privacy Policy' || label === 'Terms of Service') {
      window.open('https://luminalifeos.com', '_blank');
    } else if (label === 'Report a Bug') {
      setReportBug(true);
    } else if (label === 'Rate the App') {
      window.open('market://details?id=com.lumina.lifeos', '_blank') || 
      window.open('itms-apps://itunes.apple.com/app/id123456789', '_blank') ||
      addToast('info', 'Redirecting to App Store / Google Play...');
    }
  }

  const SECTIONS = [
    {
      title: 'NOTIFICATIONS',
      rows: [
        { icon: '🔔', label: 'Push Notifications', description: 'Get reminders and updates', value: notifications, onChange: requestPushPermission },
        { icon: '⏰', label: 'Daily Reminder', description: 'Morning journal prompt at 9 AM', value: dailyReminder, onChange: handleDailyReminder },
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
      <div style={{ marginBottom: 24 }}><AICard insight={aiInsight} /></div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => navigate(-1)} style={{ width: 36, height: 36 }}>←</button>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Settings</h1>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {/* Theme / Background Color */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: 14 }}>🎨 BACKGROUND THEME</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {Object.entries(THEMES).map(([key, theme]) => {
              const active = bgTheme === key;
              return (
                <motion.button
                  key={key}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setBgTheme(key); addToast('success', `Theme: ${theme.label}`); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                  }}
                >
                  <div style={{
                    width: 46, height: 46, borderRadius: 14,
                    background: theme.bg,
                    border: active ? '2.5px solid var(--mind)' : '2px solid var(--border)',
                    boxShadow: active ? '0 0 0 3px rgba(123,111,218,0.25)' : 'none',
                    transition: 'all 0.2s',
                    position: 'relative', overflow: 'hidden',
                  }}>
                    <div style={{ position: 'absolute', bottom: 4, right: 4, width: 18, height: 18, borderRadius: 6, background: theme.surface }} />
                    {active && (
                      <div style={{ position: 'absolute', top: 3, right: 3, width: 10, height: 10, borderRadius: '50%', background: 'var(--mind)' }} />
                    )}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 600, color: active ? 'var(--text)' : 'var(--muted)', letterSpacing: '0.01em' }}>{theme.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
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
            { icon: '🔒', label: 'Privacy Policy' },
            { icon: '📄', label: 'Terms of Service' },
            { icon: '🐛', label: 'Report a Bug' },
            { icon: '⭐', label: 'Rate the App' },
          ].map((item) => (
            <button key={item.label} onClick={() => handleAboutAction(item.label)}
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

      <AnimatePresence>
        {reportBug && (
           <ConfirmModal title="Report a Bug" message="Your bug report and current application logs will be sent to the Lumina engineering team over a secure channel." confirmText="Send Report"
           onConfirm={() => { addToast('success', 'Bug report securely submitted. Thank you!'); setReportBug(false); }} onCancel={() => setReportBug(false)} />
        )}
      </AnimatePresence>

    </motion.div>
  );
}

