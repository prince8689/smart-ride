import React from 'react';
import { usePWA } from '../../hooks/usePWA';
import Button from '../ui/Button';

export default function UpdatePrompt() {
  const { isUpdateAvailable, updateApp } = usePWA();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-primary-600 text-white p-4 flex flex-col sm:flex-row items-center justify-between gap-4 z-50 shadow-lg animate-in slide-in-from-bottom-full">
      <p className="text-sm font-medium">
        A new version of Smart Ride is available!
      </p>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={updateApp}
        className="border-white text-white hover:bg-primary-700 whitespace-nowrap"
      >
        Refresh to Update
      </Button>
    </div>
  );
}
