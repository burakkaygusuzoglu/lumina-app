/**
 * Terms of Service — Lumina Life OS
 */
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const LAST_UPDATED = 'March 7, 2026';
const CONTACT_EMAIL = 'legal@luminalifeos.com';

const SECTIONS = [
  {
    title: '1. Acceptance of Terms',
    icon: '✅',
    content: `By creating an account or using Lumina Life OS ("the App", "the Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, do not use the Service.

These terms apply to all users of Lumina Life OS, including free and premium users.`,
  },
  {
    title: '2. Description of Service',
    icon: '📱',
    content: `Lumina Life OS is an AI-powered personal life management platform that includes:

• Memory & Mind vault with semantic AI search
• Daily journal with AI prompts and mood tracking
• Health, nutrition, and fitness tracking with AI analysis
• Goal setting, habit tracking, and life planning
• Encrypted personal vault for sensitive information
• AI chat assistant powered by Claude (Anthropic)

The Service is provided "as is" and may be updated or modified at any time.`,
  },
  {
    title: '3. Account Registration',
    icon: '🔐',
    content: `• You must be at least 13 years old to use this Service
• You are responsible for maintaining the confidentiality of your account credentials
• You are responsible for all activity that occurs under your account
• You must provide accurate and complete information during registration
• One person may not maintain more than one free account
• We reserve the right to terminate accounts that violate these Terms`,
  },
  {
    title: '4. Acceptable Use',
    icon: '✅',
    content: `You agree NOT to use Lumina Life OS to:

• Violate any applicable laws or regulations
• Upload or transmit malicious code, viruses, or harmful content
• Attempt to gain unauthorized access to any part of the Service
• Harass, threaten, or harm other users
• Use automated tools to scrape or extract data
• Reverse engineer or decompile the application
• Share your account credentials with others

Violations may result in immediate account termination.`,
  },
  {
    title: '5. Your Content',
    icon: '📝',
    content: `• You retain full ownership of all content you create in Lumina Life OS
• By using the Service, you grant us a limited license to store and process your content solely to provide the Service
• We do not claim ownership over your journal entries, memories, tasks, or any personal data
• You are responsible for the content you create and store
• We reserve the right to remove content that violates these Terms`,
  },
  {
    title: '6. AI Features Disclaimer',
    icon: '🤖',
    content: `Lumina Life OS uses AI (Anthropic Claude) to provide insights, suggestions, and analysis. Please note:

• AI-generated content is for informational purposes only
• AI insights do NOT constitute medical, psychological, legal, or financial advice
• Always consult qualified professionals for health and medical decisions
• AI responses may contain errors or inaccuracies — use your own judgment
• We are not responsible for decisions made based on AI-generated content`,
  },
  {
    title: '7. Privacy',
    icon: '🛡️',
    content: `Your use of Lumina Life OS is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using the Service, you agree to the collection and use of information as described in our Privacy Policy.`,
  },
  {
    title: '8. Service Availability',
    icon: '⚡',
    content: `• We strive for 99.9% uptime but do not guarantee uninterrupted Service
• Scheduled maintenance may cause temporary unavailability (we'll notify you in advance)
• We are not liable for data loss due to technical failures — though we maintain robust backups
• Features may be added, modified, or removed at our discretion with reasonable notice`,
  },
  {
    title: '9. Intellectual Property',
    icon: '©️',
    content: `• The Lumina Life OS brand, design, code, and features are our intellectual property
• You may not copy, distribute, or create derivative works based on our Service
• Providing feedback or suggestions grants us the right to use them without compensation
• "Lumina Life OS" and the associated logo are trademarks of Lumina`,
  },
  {
    title: '10. Limitation of Liability',
    icon: '⚖️',
    content: `To the maximum extent permitted by law:

• We are not liable for indirect, incidental, or consequential damages
• Our total liability to you shall not exceed the amount you paid for the Service in the past 12 months
• We are not liable for any loss of data, though we take extensive precautions to prevent it
• These limitations apply regardless of the theory of liability`,
  },
  {
    title: '11. Termination',
    icon: '🚫',
    content: `• You may terminate your account at any time from Profile → Delete Account
• We may suspend or terminate accounts that violate these Terms
• Upon termination, your data will be deleted within 30 days per our Privacy Policy
• Sections 5, 9, 10, and 12 survive termination`,
  },
  {
    title: '12. Changes to Terms',
    icon: '📋',
    content: `We may update these Terms from time to time. We will notify you of significant changes via in-app notification at least 30 days before they take effect. Continued use of the Service after changes constitutes acceptance of the updated Terms.`,
  },
  {
    title: '13. Contact',
    icon: '✉️',
    content: `For legal inquiries or questions about these Terms:\n\nEmail: ${CONTACT_EMAIL}\nResponse time: Within 5 business days`,
  },
];

export default function TermsOfService() {
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
          <h1 style={{ fontSize: 24, fontWeight: 800 }}>Terms of Service</h1>
          <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>Last updated: {LAST_UPDATED}</p>
        </div>
      </div>

      {/* Intro */}
      <div style={{
        background: 'rgba(61,170,134,0.08)',
        border: '1px solid rgba(61,170,134,0.2)',
        borderRadius: 16, padding: '16px 18px',
        marginBottom: 20,
      }}>
        <p style={{ fontSize: 14, color: 'var(--text)', lineHeight: 1.6 }}>
          Please read these Terms carefully before using Lumina Life OS. These terms govern your use of our service and establish important legal protections for both you and us.
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
