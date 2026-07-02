import React from 'react';
import { usePWA } from '../../hooks/usePWA';
import { WifiOff } from 'lucide-react';

export default function OfflineIndicator() {
  const { isOffline } = usePWA();

  if (!isOffline) return null;

  return (
    <div className="bg-red-500 text-white px-4 py-2 text-sm font-medium flex items-center justify-center gap-2">
      <WifiOff size={16} />
      <span>You are currently offline. Some features may be unavailable.</span>
    </div>
  );
}
