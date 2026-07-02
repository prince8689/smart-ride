import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';
import { getSettings } from '../../api/settings.api';

const Footer = () => {
  const [settings, setSettings] = useState({ contact_phone: '', contact_email: '' });

  useEffect(() => {
    getSettings().then(res => {
      const data = res.data || {};
      setSettings({
        contact_phone: data.contact_phone || '+91 9876543210',
        contact_email: data.contact_email || 'support@smartride.com'
      });
    }).catch(err => console.error("Failed to load settings", err));
  }, []);

  return (
    <footer className="bg-navy-900 text-navy-200 py-12">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex flex-col md:flex-row justify-between items-center md:items-start mb-8 gap-8">
          <div className="flex flex-col items-center md:items-start text-center md:text-left">
            <Link to="/" className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                SR
              </div>
              <span className="font-bold text-xl text-white">Smart Ride</span>
            </Link>
            <p className="max-w-xs text-navy-300">
              Your reliable daily commute partner. Stop booking cabs daily.
            </p>
          </div>
          
          <div className="flex gap-12">
            <div className="flex flex-col gap-3">
              <h4 className="text-white font-semibold mb-2">Contact Us</h4>
              <div className="flex items-center gap-2 text-navy-300">
                <Phone size={16} className="text-primary-400" />
                <span>{settings.contact_phone}</span>
              </div>
              <div className="flex items-center gap-2 text-navy-300">
                <Mail size={16} className="text-primary-400" />
                <span>{settings.contact_email}</span>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <h4 className="text-white font-semibold mb-2">Legal</h4>
              <Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
              <Link to="/terms/commuter" className="hover:text-white transition-colors">Terms (Commuter)</Link>
              <Link to="/terms/driver" className="hover:text-white transition-colors">Terms (Driver)</Link>
            </div>
          </div>
        </div>
        
        <div className="border-t border-navy-800 pt-8 text-center text-sm text-navy-400">
          <p>&copy; {new Date().getFullYear()} Smart Ride. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
