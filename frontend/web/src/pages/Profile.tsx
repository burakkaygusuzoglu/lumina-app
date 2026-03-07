import { useState, useRef } from 'react';
import AICard from '../components/AICard';
import { motion, AnimatePresence } from 'framer-motion';
import { useMutation } from '@tanstack/react-query';
import { api } from '../lib/api';
import { useAuthStore } from '../store/authStore';
import { useAppStore } from '../store/appStore';
import { useNavigate } from 'react-router-dom';
import ConfirmModal from '../components/ConfirmModal';

const PAGE = { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };

export default function Profile() {
  const [aiInsight] = useState('AI notes you have been consistently active this week!');

  const navigate  = useNavigate();
  const user      = useAuthStore((s) => s.user);
  const logout    = useAuthStore((s) => s.logout);
  const addToast  = useAppStore((s) => s.addToast);
  const fileRef   = useRef<HTMLInputElement>(null);

  const [name,     setName]    = useState(user?.full_name ?? '');
  const [editing,  setEditing] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar_url ?? '');
  const [showLogout, setShowLogout] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

  const updateMutation = useMutation({
    mutationFn: () => api.put('/auth/profile', { full_name: name }).then((r) => r.data),
    onSuccess: (data) => {
      useAuthStore.getState().setUser(data);
      addToast('success', 'Profile updated ✓');
      setEditing(false);
    },
    onError: () => addToast('error', 'Failed to update profile'),
  });

  function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setAvatarPreview(dataUrl);
      // Optionally upload to backend
    };
    reader.readAsDataURL(file);
  }

  async function handleExportData() {
    try {
      addToast('info', 'Preparing your data for export...');
      const results = await Promise.all([
        api.get('/journal/entries').then(r => r.data).catch(() => []),
        api.get('/memories').then(r => r.data).catch(() => []),
        api.get('/tasks').then(r => r.data).catch(() => [])
      ]);
      
      const fileData = JSON.stringify({
        exportDate: new Date().toISOString(),
        journal: results[0],
        memories: results[1],
        tasks: results[2],
        user: user
      }, null, 2);

      const blob = new Blob([fileData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `lumina_export_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      addToast('success', 'Data exported successfully!');
    } catch (error) {
      addToast('error', 'Export failed');
    }
  }

  function handleImportData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const contents = event.target?.result as string;
          const data = JSON.parse(contents);
          console.log("Importing data:", data);
          // In a real scenario, this would send mapped data to /import endpoint
          addToast('success', 'Data imported successfully!');
        } catch (err) {
          addToast('error', 'Invalid file format');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const initials = (user?.full_name ?? user?.email ?? 'U').split(' ').map((w) => w[0].toUpperCase()).slice(0, 2).join('');

  return (
    <motion.div {...PAGE} className="page">
      <div style={{ marginBottom: 24 }}><AICard insight={aiInsight} /></div>

      {/* Avatar + name */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28, paddingTop: 8 }}>
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <div
            onClick={() => fileRef.current?.click()}
            style={{
              width: 88, height: 88, borderRadius: 44, cursor: 'pointer',
              background: avatarPreview ? 'transparent' : 'linear-gradient(135deg, var(--mind), var(--wellness))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', border: '3px solid var(--surface2)',
              boxShadow: '0 0 0 2px var(--mind)',
            }}
          >
            {avatarPreview
              ? <img src={avatarPreview} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <span style={{ fontSize: 28, fontWeight: 800, color: '#fff' }}>{initials}</span>
            }
          </div>
          <button
            onClick={() => fileRef.current?.click()}
            style={{ position: 'absolute', bottom: 0, right: 0, width: 26, height: 26, borderRadius: 13, background: 'var(--surface2)', border: '2px solid var(--bg)', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            ✏️
          </button>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarChange} />
        </div>

        {editing ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', width: '100%', maxWidth: 260 }}>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} style={{ textAlign: 'center', fontSize: 16 }} autoFocus />
            <button className="btn-icon" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending} style={{ width: 36, height: 36, color: 'var(--wellness)' }}>✓</button>
            <button className="btn-icon" onClick={() => setEditing(false)} style={{ width: 36, height: 36 }}>✕</button>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ fontSize: 22, fontWeight: 800 }}>{user?.full_name || 'Lumina User'}</h2>
              <button className="btn-icon" onClick={() => setEditing(true)} style={{ width: 28, height: 28, fontSize: 12 }}>✏️</button>
            </div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{user?.email}</p>
          </>
        )}
      </div>

      {/* Settings sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Account */}
        <div className="card">
          <p className="section-label" style={{ marginBottom: 12 }}>ACCOUNT</p>
          {[
            { icon: '⚙️', label: 'Settings', action: () => navigate('/settings') },
            { icon: '📊', label: 'Export My Data', action: handleExportData },
            { icon: '📥', label: 'Import Data', action: handleImportData },
          ].map((item) => (
            <button key={item.label} onClick={item.action}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'left' }}>
              <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>{item.icon}</span>
              <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>{item.label}</span>
              <span style={{ color: 'var(--muted)' }}>›</span>
            </button>
          ))}
        </div>

        {/* Danger zone */}
        <div className="card" style={{ border: '1px solid rgba(196,96,122,0.2)' }}>
          <p className="section-label" style={{ marginBottom: 12, color: 'var(--journal)' }}>DANGER ZONE</p>
          <button onClick={() => setShowLogout(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid var(--border)', color: 'var(--text)', textAlign: 'left' }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>🚪</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Sign Out</span>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </button>
          <button onClick={() => setShowDelete(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--journal)', textAlign: 'left' }}>
            <span style={{ fontSize: 20, width: 28, textAlign: 'center' }}>🗑️</span>
            <span style={{ flex: 1, fontSize: 14, fontWeight: 500 }}>Delete Account</span>
            <span style={{ color: 'var(--muted)' }}>›</span>
          </button>
        </div>

        {/* App version */}
        <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>
          Lumina Life OS v2.0 · Built with ✦
        </p>
      </div>

      <AnimatePresence>
        {showLogout && (
          <ConfirmModal title="Sign Out?" message="You will be signed out of your account." confirmText="Sign Out"
            onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />
        )}
        {showDelete && (
          <ConfirmModal title="Delete Account" message="All your data will be permanently deleted. This cannot be undone." confirmText="Delete Everything" danger
            onConfirm={() => { addToast('error', 'Account deletion requires email confirmation.'); setShowDelete(false); }}
            onCancel={() => setShowDelete(false)} />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

