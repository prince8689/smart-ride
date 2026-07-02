import React, { useState, useEffect } from 'react';
import { usePWA } from '../../hooks/usePWA';
import Button from '../ui/Button';
import { X } from 'lucide-react';

export default function InstallPrompt() {
  const { isInstallable, installPWA } = usePWA();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isInstallable) {
      // Check if user dismissed recently (within 7 days)
      const lastDismissed = localStorage.getItem('sr_pwa_dismissed');
      if (lastDismissed) {
        const daysSince = (Date.now() - parseInt(lastDismissed)) / (1000 * 60 * 60 * 24);
        if (daysSince < 7) return;
      }

      // Show prompt after 30 seconds of engagement
      const timer = setTimeout(() => setShow(true), 30000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable]);

  const handleDismiss = () => {
    setShow(false);
    localStorage.setItem('sr_pwa_dismissed', Date.now().toString());
  };

  if (!show || !isInstallable) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-8 md:w-96 bg-white p-4 rounded-2xl shadow-xl z-50 border border-navy-100 flex items-start gap-4 animate-in slide-in-from-bottom-5">
      <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-xl flex items-center justify-center font-bold text-xl shrink-0">
        SR
      </div>
      <div className="flex-1">
        <h3 className="font-bold text-navy-900">Install Smart Ride</h3>
        <p className="text-sm text-navy-500 mt-1 mb-3">
          Get a better experience with offline support and push notifications.
        </p>
        <div className="flex gap-2">
          <Button variant="primary" size="sm" onClick={installPWA} className="flex-1">
            Install App
          </Button>
          <Button variant="outline" size="sm" onClick={handleDismiss}>
            Not Now
          </Button>
        </div>
      </div>
      <button onClick={handleDismiss} className="text-navy-400 hover:text-navy-600 absolute top-2 right-2">
        <X size={16} />
      </button>
    </div>
  );
}
