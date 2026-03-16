import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin, Facebook, Twitter, Linkedin } from 'lucide-react';
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

  return (
    <footer className="bg-gray-950 border-t border-gray-800 text-gray-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <img src="/ChatGPT_Image_Mar_16,_2026,_11_55_58_AM.png" alt="EquipLink" className="h-12 w-auto" />
            <p className="text-sm leading-relaxed">
              The premier marketplace connecting heavy equipment owners with mechanics, parts suppliers, and rental providers.
            </p>
            <div className="flex gap-3">
              {contact.facebook_url ? (
                <a href={contact.facebook_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-yellow-400 transition-colors"><Facebook className="w-5 h-5" /></a>
              ) : (
                <span className="text-gray-700 cursor-default"><Facebook className="w-5 h-5" /></span>
              )}
              {contact.twitter_url ? (
                <a href={contact.twitter_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-yellow-400 transition-colors"><Twitter className="w-5 h-5" /></a>
              ) : (
                <span className="text-gray-700 cursor-default"><Twitter className="w-5 h-5" /></span>
              )}
              {contact.linkedin_url ? (
                <a href={contact.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-yellow-400 transition-colors"><Linkedin className="w-5 h-5" /></a>
              ) : (
                <span className="text-gray-700 cursor-default"><Linkedin className="w-5 h-5" /></span>
              )}
            </div>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Marketplace</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/marketplace/mechanics" className="hover:text-yellow-400 transition-colors">Find Mechanics</Link></li>
              <li><Link to="/marketplace/parts" className="hover:text-yellow-400 transition-colors">Spare Parts</Link></li>
              <li><Link to="/marketplace/rentals" className="hover:text-yellow-400 transition-colors">Equipment Rentals</Link></li>
              <li><Link to="/breakdown" className="hover:text-yellow-400 transition-colors">Post Breakdown</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">For Professionals</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/register?role=mechanic" className="hover:text-yellow-400 transition-colors">Join as Mechanic</Link></li>
              <li><Link to="/register?role=supplier" className="hover:text-yellow-400 transition-colors">List Parts</Link></li>
              <li><Link to="/register?role=rental_provider" className="hover:text-yellow-400 transition-colors">List Equipment</Link></li>
              <li><Link to="/register" className="hover:text-yellow-400 transition-colors">Create Account</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Contact</h4>
            <ul className="space-y-2 text-sm">
              {contact.email && (
                <li className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <a href={`mailto:${contact.email}`} className="hover:text-yellow-400 transition-colors truncate">{contact.email}</a>
                </li>
              )}
              {contact.phone && (
                <li className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <a href={`tel:${contact.phone}`} className="hover:text-yellow-400 transition-colors">{contact.phone}</a>
                </li>
              )}
              {contact.address && (
                <li className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                  <span>{contact.address}</span>
                </li>
              )}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-gray-800 flex flex-col sm:flex-row justify-between items-center gap-3 text-sm">
          <p>&copy; 2026 EquipLink. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-yellow-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-yellow-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
