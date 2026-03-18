import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin, Wrench } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface ContactSettings {
  email: string;
  phone: string;
  address: string;
  facebook_url: string;
  twitter_url: string;
  linkedin_url: string;
}

const DEFAULTS: ContactSettings = {
  email: 'support@equiplink.com',
  phone: '+1 (800) 555-0123',
  address: 'Houston, TX 77002',
  facebook_url: '',
  twitter_url: '',
  linkedin_url: '',
};

const MARKETPLACE_LINKS = [
  { label: 'Find Mechanics', to: '/marketplace/mechanics' },
  { label: 'Spare Parts', to: '/marketplace/parts' },
  { label: 'Equipment Rentals', to: '/marketplace/rentals' },
  { label: 'Post Breakdown', to: '/breakdown' },
];

const PRO_LINKS = [
  { label: 'Join as Mechanic', to: '/register?role=mechanic' },
  { label: 'List Parts', to: '/register?role=supplier' },
  { label: 'List Equipment', to: '/register?role=rental_provider' },
  { label: 'Create Account', to: '/register' },
];

export default function Footer() {
  const [contact, setContact] = useState<ContactSettings>(DEFAULTS);

  useEffect(() => {
    supabase
      .from('contact_settings')
      .select('email, phone, address, facebook_url, twitter_url, linkedin_url')
      .maybeSingle()
      .then(({ data }) => {
        if (data) setContact(data as ContactSettings);
      });
  }, []);

  const socialLinks = [
    { url: contact.facebook_url, Icon: Facebook, label: 'Facebook' },
    { url: contact.twitter_url, Icon: Twitter, label: 'Twitter' },
    { url: contact.linkedin_url, Icon: Linkedin, label: 'LinkedIn' },
  ];

  return (
    <footer className="bg-[#0b0f19] border-t border-gray-800/60">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-12">

          <div className="flex flex-col gap-5">
            <Link to="/" className="inline-flex items-center gap-2.5 w-fit">
              <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <Wrench className="w-5 h-5 text-gray-900" />
              </div>
              <span className="text-white font-bold text-xl leading-none">
                Equip<span className="text-yellow-400">Link</span>
              </span>
            </Link>

            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              The premier marketplace connecting heavy equipment owners with mechanics, parts suppliers, and rental providers.
            </p>

            <div className="flex items-center gap-3 mt-1">
              {socialLinks.map(({ url, Icon, label }) =>
                url ? (
                  <a
                    key={label}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="w-8 h-8 rounded-lg bg-gray-800 hover:bg-yellow-400 flex items-center justify-center text-gray-400 hover:text-gray-900 transition-all duration-200"
                  >
                    <Icon className="w-4 h-4" />
                  </a>
                ) : (
                  <span
                    key={label}
                    className="w-8 h-8 rounded-lg bg-gray-800/50 flex items-center justify-center text-gray-700 cursor-default"
                  >
                    <Icon className="w-4 h-4" />
                  </span>
                )
              )}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
              Marketplace
            </h4>
            <ul className="space-y-3">
              {MARKETPLACE_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-150 inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-yellow-400 transition-colors flex-shrink-0"></span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
              For Professionals
            </h4>
            <ul className="space-y-3">
              {PRO_LINKS.map(({ label, to }) => (
                <li key={to}>
                  <Link
                    to={to}
                    className="text-gray-400 hover:text-yellow-400 text-sm transition-colors duration-150 inline-flex items-center gap-1.5 group"
                  >
                    <span className="w-1 h-1 rounded-full bg-gray-600 group-hover:bg-yellow-400 transition-colors flex-shrink-0"></span>
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold text-sm uppercase tracking-wider mb-5">
              Contact
            </h4>
            <ul className="space-y-4">
              {contact.email && (
                <li>
                  <a
                    href={`mailto:${contact.email}`}
                    className="inline-flex items-start gap-3 text-gray-400 hover:text-yellow-400 transition-colors duration-150 group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-yellow-400/10 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                      <Mail className="w-4 h-4 text-yellow-400" />
                    </span>
                    <span className="text-sm leading-relaxed break-all">{contact.email}</span>
                  </a>
                </li>
              )}
              {contact.phone && (
                <li>
                  <a
                    href={`tel:${contact.phone}`}
                    className="inline-flex items-start gap-3 text-gray-400 hover:text-yellow-400 transition-colors duration-150 group"
                  >
                    <span className="w-8 h-8 rounded-lg bg-gray-800 group-hover:bg-yellow-400/10 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors">
                      <Phone className="w-4 h-4 text-yellow-400" />
                    </span>
                    <span className="text-sm">{contact.phone}</span>
                  </a>
                </li>
              )}
              {contact.address && (
                <li>
                  <div className="inline-flex items-start gap-3 text-gray-400">
                    <span className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <MapPin className="w-4 h-4 text-yellow-400" />
                    </span>
                    <span className="text-sm leading-relaxed">{contact.address}</span>
                  </div>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-gray-800/60 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-gray-500 text-sm">
            &copy; 2026 EquipLink. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-gray-500 hover:text-yellow-400 text-sm transition-colors duration-150">
              Privacy Policy
            </a>
            <a href="#" className="text-gray-500 hover:text-yellow-400 text-sm transition-colors duration-150">
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
