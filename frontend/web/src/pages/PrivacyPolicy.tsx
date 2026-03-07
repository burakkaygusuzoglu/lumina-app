/**
 * Privacy Policy — Lumina Life OS
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const LAST_UPDATED = 'March 7, 2026';
const CONTACT_EMAIL = 'privacy@luminalifeos.com';

const SECTIONS = [
  {
    title: '1. Information We Collect',
    icon: '📋',
    content: `We collect the following information when you use Lumina Life OS:

• Account data: email address, display name, encrypted password hash
• Content you create: journal entries, memories, tasks, mood logs, health data, vault items
• Usage data: feature usage patterns, session duration (anonymized)
• Device info: browser type, OS version, timezone (for reminders)

We do NOT collect: phone numbers, payment info, precise GPS location, contacts, or camera content without your explicit action.`,
  },
  {
    title: '2. How We Use Your Data',
    icon: '🔍',
    content: `Your data is used exclusively to:

• Provide and improve the Lumina Life OS service
• Power AI features (Claude AI processes your queries — Anthropic's privacy policy applies)
• Semantic search via Pinecone vector embeddings (text only, no personal identifiers)
• Send you notifications you have explicitly enabled
• Diagnose technical issues and crashes

We do NOT sell, rent, or share your personal data with advertisers or third parties for commercial purposes.`,
  },
  {
    title: '3. Data Storage & Security',
    icon: '🔒',
    content: `• All data is stored on Supabase (PostgreSQL) with Row Level Security (RLS) — only you can access your own data
• All data in transit is encrypted using TLS 1.3
• Passwords are hashed using bcrypt (never stored in plain text)
• Vault items are end-to-end encrypted on your device before transmission
• API keys and secrets are stored in environment variables, never in source code
• We conduct regular security audits and dependency updates`,
  },
  {
    title: '4. AI & Third-Party Services',
    icon: '🤖',
    content: `Lumina uses the following third-party services:

• Anthropic Claude: AI chat & insights. Your messages are processed per Anthropic's privacy policy (anthropic.com/privacy)
• Pinecone: Vector search for semantic memory retrieval. Only embedding vectors (no raw text) are stored on Pinecone servers
• Supabase: Database and authentication hosting (supabase.com/privacy)
• Railway: Backend API hosting
• Vercel: Frontend hosting

Each third party is bound by data processing agreements and their own privacy policies.`,
  },
  {
    title: '5. Data Retention',
    icon: '🗓️',
    content: `• Your data is retained as long as your account is active
• Deleted items are permanently removed within 30 days
• When you delete your account, all data is permanently erased within 30 days
• Anonymized analytics data (no personal identifiers) may be retained for up to 2 years for product improvement`,
  },
  {
    title: '6. Your Rights',
    icon: '⚖️',
    content: `You have the right to:

• Access: Request a full export of your data at any time
• Correction: Update any inaccurate information in your profile
• Deletion: Delete your account and all associated data
• Portability: Receive your data in a machine-readable format (CSV/JSON)
• Objection: Opt out of analytics data collection in Settings → Privacy
• Withdrawal: Revoke notification permissions at any time in your device settings

To exercise these rights, contact us at ${CONTACT_EMAIL}`,
  },
  {
    title: '7. Cookies & Local Storage',
    icon: '🍪',
    content: `Lumina uses browser localStorage (not cookies) to:

• Store your authentication token (session management)
• Remember your theme preference
• Store notification settings
• Track onboarding completion

No advertising cookies or cross-site tracking technologies are used.`,
  },
  {
    title: '8. Children\'s Privacy',
    icon: '👶',
    content: `Lumina Life OS is not intended for users under 13 years of age. We do not knowingly collect personal information from children under 13. If you believe a child has provided us with personal information, please contact us immediately at ${CONTACT_EMAIL} and we will delete it promptly.`,
  },
  {
    title: '9. Changes to This Policy',
    icon: '📝',
    content: `We may update this Privacy Policy periodically. We will notify you of significant changes via in-app notification at least 30 days before they take effect. Continued use of Lumina after changes constitutes acceptance of the updated policy.`,
  },
  {
    title: '10. Contact Us',
    icon: '✉️',
    content: `For privacy-related questions, data requests, or concerns:\n\nEmail: ${CONTACT_EMAIL}\nResponse time: Within 48 hours\n\nFor general support: support@luminalifeos.com`,
  },
];

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1,  y: 0  }}
      className="page"
      style={{ paddingBottom: 60 }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <button className="btn-icon" onClick={() => navigate(-1)} style={{ width: 36, height: 36 }}>←</button>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Privacy Policy</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Intro */}
      <div style={{
        background: 'rgba(123,111,218,0.08)',
        border: '1px solid rgba(123,111,218,0.2)',
        borderRadius: 16, padding: '16px 18px',
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
          <strong>Lumina Life OS</strong> is committed to protecting your privacy. This policy explains what data we collect, how we use it, and your rights. We believe in radical transparency — your life data belongs to you.
        </p>
      </div>

      {/* Sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {SECTIONS.map((s) => (
          <div key={s.title} className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{s.title}</h3>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.75, whiteSpace: 'pre-line' }}>
              {s.content}
            </p>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
