import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, ArrowLeft } from 'lucide-react';

export default function TermsOfService() {
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
              <FileText className="w-5 h-5 text-yellow-400" />
            </div>
            <h1 className="text-2xl md:text-3xl font-black text-white">Terms of Service</h1>
          </div>
          <p className="text-gray-500 text-sm">Last updated: March 2026</p>
        </div>

        <div className="prose prose-invert max-w-none space-y-8 text-gray-300">

          <section>
            <p className="text-gray-400 leading-relaxed">
              Welcome to EquipLink. By accessing or using our platform, you agree to be bound by these Terms of Service. Please read them carefully before using our services. If you do not agree, you may not use EquipLink.
            </p>
          </section>

          <Section title="1. About EquipLink">
            <p className="text-gray-400 text-sm leading-relaxed">
              EquipLink is a digital marketplace that connects heavy equipment owners with mechanics, spare parts suppliers, and equipment rental providers in Ethiopia. We provide a platform for users to discover services, post breakdown requests, communicate, and transact — but we are not a party to any agreement made between users.
            </p>
          </Section>

          <Section title="2. Eligibility and Account Registration">
            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm leading-relaxed">
              <li>You must be at least 18 years old to create an account.</li>
              <li>You must provide accurate, current, and complete information during registration.</li>
              <li>You are responsible for maintaining the confidentiality of your login credentials.</li>
              <li>You may not create accounts on behalf of others without their explicit consent.</li>
              <li>EquipLink reserves the right to suspend or terminate accounts that violate these terms.</li>
            </ul>
          </Section>

          <Section title="3. User Roles and Responsibilities">
            <Subsection title="Equipment Owners">
              May post breakdown requests, search for mechanics and parts, rent equipment, write reviews, and manage their machine profiles. Owners are responsible for the accuracy of their equipment listings and breakdown descriptions.
            </Subsection>
            <Subsection title="Mechanics / Technicians">
              May create professional profiles, respond to service requests and breakdown jobs, set their availability and rates, and participate in the forum. Mechanics are solely responsible for the quality and safety of services they provide.
            </Subsection>
            <Subsection title="Spare Parts Suppliers">
              May list parts for sale with accurate descriptions, prices, and availability. Suppliers are responsible for the quality, authenticity, and delivery of listed items.
            </Subsection>
            <Subsection title="Rental Providers">
              May list equipment available for rent with correct specifications, pricing, and availability. Rental providers are responsible for the condition and safety of rented equipment.
            </Subsection>
          </Section>

          <Section title="4. Wallet, Credits, and Payments">
            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm leading-relaxed">
              <li>EquipLink operates an in-platform wallet (ETB) for transactions including credit purchases, subscriptions, and service fees.</li>
              <li>All wallet top-ups are final. Funds are non-refundable unless required by law.</li>
              <li>Credits are consumed when viewing contact information or accessing premium features.</li>
              <li>EquipLink charges commission fees on transactions facilitated through the platform. Current rates are displayed in your dashboard.</li>
              <li>Pro subscriptions provide enhanced features and are billed monthly or annually. Subscriptions auto-renew unless cancelled before the renewal date.</li>
              <li>Prices are denominated in Ethiopian Birr (ETB). EquipLink is not responsible for currency conversion or bank fees.</li>
            </ul>
          </Section>

          <Section title="5. Prohibited Conduct">
            <p className="text-gray-400 text-sm leading-relaxed mb-3">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-gray-400 text-sm leading-relaxed">
              <li>Post false, misleading, or fraudulent information or listings</li>
              <li>Harass, threaten, or abuse other users</li>
              <li>Attempt to circumvent the platform to avoid fees (e.g., taking transactions off-platform after initial contact)</li>
              <li>Create multiple accounts to abuse free trial features or credits</li>
              <li>Scrape, copy, or systematically extract platform data</li>
              <li>Upload malware, viruses, or any malicious code</li>
              <li>Impersonate another person or organization</li>
              <li>Use the AI Diagnose feature for purposes other than legitimate equipment diagnostics</li>
              <li>Post content that is illegal, obscene, discriminatory, or violates any third-party rights</li>
            </ul>
          </Section>

          <Section title="6. Content and Intellectual Property">
            <p className="text-gray-400 text-sm leading-relaxed">
              You retain ownership of content you post (photos, descriptions, reviews). By posting, you grant EquipLink a non-exclusive, worldwide, royalty-free license to use, display, and distribute that content for platform purposes. EquipLink's branding, design, software, and original content remain the exclusive property of EquipLink. You may not reproduce or use them without written permission.
            </p>
          </Section>

          <Section title="7. Reviews and Ratings">
            <p className="text-gray-400 text-sm leading-relaxed">
              Reviews must be honest, based on genuine first-hand experience, and not defamatory. EquipLink reserves the right to remove reviews that violate these terms. Attempting to manipulate ratings — by posting fake reviews, coercing users, or offering incentives — may result in account suspension.
            </p>
          </Section>

          <Section title="8. AI Diagnose Feature">
            <p className="text-gray-400 text-sm leading-relaxed">
              The AI Diagnose tool provides general diagnostic suggestions based on symptoms you describe. It is intended as a supplementary aid only and does not constitute professional mechanical advice. EquipLink is not liable for any actions taken based on AI Diagnose outputs. Always consult a qualified mechanic for serious equipment issues.
            </p>
          </Section>

          <Section title="9. Disclaimers and Limitation of Liability">
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              EquipLink provides a platform for connecting users. We do not employ mechanics, supply parts, or operate rental equipment. We do not verify the qualifications, licenses, or credentials of any user.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              THE PLATFORM IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND. TO THE FULLEST EXTENT PERMITTED BY LAW, EQUIPLINK DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed">
              EquipLink's total liability for any claim arising out of your use of the platform shall not exceed the amount you paid to EquipLink in the 3 months preceding the claim.
            </p>
          </Section>

          <Section title="10. Dispute Resolution">
            <p className="text-gray-400 text-sm leading-relaxed">
              Disputes between users (e.g., service quality, payment disagreements) are primarily the responsibility of the involved parties. EquipLink may offer mediation support at its discretion. Any disputes with EquipLink itself shall first be attempted to be resolved informally by contacting us. If unresolved, disputes shall be governed by the laws of Ethiopia and submitted to competent courts in Addis Ababa.
            </p>
          </Section>

          <Section title="11. Account Termination">
            <p className="text-gray-400 text-sm leading-relaxed">
              You may deactivate your account at any time from your profile settings. EquipLink may suspend or terminate accounts that violate these Terms, engage in fraudulent activity, or are inactive for extended periods. Upon termination, your access to the platform ceases, though certain data may be retained as required by law.
            </p>
          </Section>

          <Section title="12. Changes to These Terms">
            <p className="text-gray-400 text-sm leading-relaxed">
              We may update these Terms from time to time. We will notify users of material changes via email or platform notification at least 14 days before changes take effect. Continued use of the platform after the effective date constitutes acceptance of the revised Terms.
            </p>
          </Section>

          <Section title="13. Contact">
            <p className="text-gray-400 text-sm leading-relaxed">
              For any questions about these Terms, please contact us:
            </p>
            <div className="mt-3 bg-gray-900 border border-gray-800 rounded-xl p-4 text-sm space-y-1">
              <p className="text-white font-semibold">EquipLink Legal</p>
              <p className="text-gray-400">Email: legal@equiplink.et</p>
              <p className="text-gray-400">Location: Addis Ababa, Ethiopia</p>
            </div>
          </Section>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-gray-500 text-xs">By using EquipLink, you confirm that you have read and agreed to these Terms.</p>
          <Link to="/privacy" className="text-yellow-400 hover:text-yellow-300 text-sm font-medium transition-colors">
            View Privacy Policy →
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
