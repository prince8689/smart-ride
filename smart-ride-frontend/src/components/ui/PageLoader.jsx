import React from 'react';
import Spinner from './Spinner';

export default function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-50">
      <div className="text-center">
        <div className="w-16 h-16 bg-primary-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-xl">SR</span>
        </div>
        <Spinner size="lg" />
        <p className="mt-4 text-navy-500 text-sm">Loading Smart Ride...</p>
      </div>
    </div>
  );
}
