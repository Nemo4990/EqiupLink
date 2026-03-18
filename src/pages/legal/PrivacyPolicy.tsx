import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Shield, ArrowLeft } from 'lucide-react';

export default function PrivacyPolicy() {
  useEffect(() => { window.scrollTo(0, 0); }, []);

  return (
    <div className="min-h-screen bg-gray-950 pt-20 pb-24 md:pb-16">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">

        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-yellow-400 transition-colors text-sm mb-6">
            <ArrowLeft className="w-4 h-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-yellow-400/10 border border-yellow-400/20 rounded-xl flex items-center justify-center">
              <Shield className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Privacy Policy</h1>
          </div>
          <p className="text-gray-500 text-sm">Last updated: March 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300">

          <section>
            <p className="text-gray-400 leading-relaxed">
              EquipLink ("we," "our," or "us") is committed to protecting your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your data when you use our platform, which connects heavy equipment owners, mechanics, suppliers, and rental providers across Ethiopia.
            </p>
          </section>

          <Section title="1. Information We Collect">
            <Subsection title="Account Information">
              When you register, we collect your full name, email address, phone number, location (region/city), and role type (owner, mechanic, supplier, or rental provider).
            </Subsection>
            <Subsection title="Profile Information">
              Mechanics may provide specializations, years of experience, service area, hourly rates, and supported equipment brands. Owners may list their machines, including make, model, year, and condition.
            </Subsection>
            <Subsection title="Transaction Data">
              We collect records of wallet top-ups, credit purchases, subscription payments, commission fees, and service request interactions.
            </Subsection>
            <Subsection title="Usage Data">
              We automatically collect information such as device type, browser, IP address, pages visited, search queries, and session duration to improve our service.
            </Subsection>
            <Subsection title="Communications">
              Messages sent between users on the platform, forum posts, breakdown requests, and reviews are stored to provide the service and ensure safety.
            </Subsection>
          </Section>

          <Section title="2. How We Use Your Information">
            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm leading-relaxed">
              <li>To create and manage your account and profile</li>
              <li>To connect equipment owners with mechanics, suppliers, and rental providers</li>
              <li>To process wallet transactions, subscriptions, and commission fees</li>
              <li>To send notifications about job requests, messages, and platform updates</li>
              <li>To display your profile and listings to relevant users</li>
              <li>To power the AI Diagnose feature using your machine and symptom data</li>
              <li>To detect and prevent fraud, abuse, and security threats</li>
              <li>To improve our platform through usage analytics</li>
              <li>To comply with applicable Ethiopian and international laws</li>
            </ul>
          </Section>

          <Section title="3. Information Sharing">
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              We do not sell your personal data. We may share information in the following circumstances:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm leading-relaxed">
              <li><strong className="text-gray-300">With other users:</strong> Your public profile, ratings, and service listings are visible to other platform users as necessary for the service to function.</li>
              <li><strong className="text-gray-300">Service providers:</strong> We use trusted third-party vendors (e.g., Supabase for data storage, payment processors) who are bound by confidentiality agreements.</li>
              <li><strong className="text-gray-300">Legal requirements:</strong> We may disclose data when required by law, court order, or to protect the rights and safety of EquipLink and its users.</li>
              <li><strong className="text-gray-300">Business transfer:</strong> In the event of a merger or acquisition, your data may be transferred to the new entity under the same privacy protections.</li>
            </ul>
          </Section>

          <Section title="4. Data Security">
            <p className="text-gray-400 text-sm leading-relaxed">
              We implement industry-standard security measures including encrypted connections (HTTPS/TLS), Row Level Security (RLS) on all database tables, session management controls, and active session monitoring. You can view and revoke active sessions from your account security settings. While we strive to protect your data, no system is 100% secure and we cannot guarantee absolute security.
            </p>
          </Section>

          <Section title="5. Data Retention">
            <p className="text-gray-400 text-sm leading-relaxed">
              We retain your account data for as long as your account is active or as needed to provide services. Transaction records are kept for a minimum of 7 years for financial compliance. You may request deletion of your account and associated data by contacting us, subject to any legal retention requirements.
            </p>
          </Section>

          <Section title="6. Your Rights">
            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm leading-relaxed">
              <li><strong className="text-gray-300">Access:</strong> Request a copy of the personal data we hold about you.</li>
              <li><strong className="text-gray-300">Correction:</strong> Update inaccurate or incomplete information through your profile settings.</li>
              <li><strong className="text-gray-300">Deletion:</strong> Request deletion of your account and data, subject to legal obligations.</li>
              <li><strong className="text-gray-300">Portability:</strong> Request an export of your data in a machine-readable format.</li>
              <li><strong className="text-gray-300">Objection:</strong> Object to processing of your data for certain purposes such as marketing.</li>
            </ul>
          </Section>

          <Section title="7. Cookies and Tracking">
            <p className="text-gray-400 text-sm leading-relaxed">
              We use session cookies essential for authentication and platform functionality. We do not use third-party advertising cookies. Analytics may use anonymized identifiers to understand platform usage. You can control cookies through your browser settings, though disabling essential cookies may affect platform functionality.
            </p>
          </Section>

          <Section title="8. Children's Privacy">
            <p className="text-gray-400 text-sm leading-relaxed">
              EquipLink is not intended for users under the age of 18. We do not knowingly collect personal information from minors. If you believe a minor has created an account, please contact us immediately.
            </p>
          </Section>

          <Section title="9. Changes to This Policy">
            <p className="text-gray-400 text-sm leading-relaxed">
              We may update this Privacy Policy from time to time. We will notify registered users of significant changes via email or an in-app notification. Continued use of the platform after changes constitutes acceptance of the updated policy.
            </p>
          </Section>

          <Section title="10. Contact Us">
            <p className="text-gray-400 text-sm leading-relaxed">
              For any privacy-related questions, data requests, or concerns, please contact us at:
            </p>
            <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm space-y-1">
              <p className="text-white font-semibold">EquipLink Privacy Team</p>
              <p className="text-gray-400">Email: privacy@equiplink.et</p>
              <p className="text-gray-400">Location: Addis Ababa, Ethiopia</p>
            </div>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">This policy applies to all EquipLink services and platforms.</p>
          <Link to="/terms" className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors">
            View Terms of Service →
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="text-lg font-bold text-white mb-3 pb-2 border-b border-gray-800">{title}</h2>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Subsection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-300 mb-1">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{children}</p>
    </div>
  );
}
