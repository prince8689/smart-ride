import React, { useState, useEffect } from 'react';
import { MAP_PROVIDER, GOOGLE_MAPS_KEY, MAPPLS_KEY } from '../../utils/constants';
import Spinner from '../ui/Spinner';
import Card from '../ui/Card';

let isScriptLoading = false;
let isScriptLoaded = false;
let scriptLoadPromise = null;

const MapWrapper = ({ children }) => {
  const [mapReady, setMapReady] = useState(isScriptLoaded);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isScriptLoaded) {
      setMapReady(true);
      return;
    }

    if (!scriptLoadPromise) {
      scriptLoadPromise = new Promise((resolve, reject) => {
        isScriptLoading = true;
        const script = document.createElement('script');
        
        if (MAP_PROVIDER === 'google') {
          script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places,directions`;
        } else if (MAP_PROVIDER === 'mappls') {
          script.src = `https://apis.mappls.com/advancedmaps/api/${MAPPLS_KEY}/map_sdk?layer=vector&v=3.0`;
        } else {
          reject(new Error('Invalid Map Provider'));
          return;
        }

        script.async = true;
        script.defer = true;
        
        script.onload = () => {
          isScriptLoaded = true;
          isScriptLoading = false;
          resolve();
        };
        
        script.onerror = () => {
          isScriptLoading = false;
          reject(new Error('Failed to load map script'));
        };

        document.head.appendChild(script);
      });
    }

    scriptLoadPromise
      .then(() => {
        setMapReady(true);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []);

  if (error) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 bg-red-50 border-red-100 text-center min-h-[300px]">
        <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-4 text-2xl font-bold">!</div>
        <h3 className="text-lg font-bold text-red-900 mb-2">Map Unavailable</h3>
        <p className="text-red-700">{error}</p>
        <p className="text-sm text-red-500 mt-4">Please check your internet connection or API keys.</p>
      </Card>
    );
  }

  if (!mapReady) {
    return (
      <div className="flex items-center justify-center w-full min-h-[300px] bg-navy-50 rounded-2xl border border-navy-100">
        <div className="flex flex-col items-center gap-3 text-navy-500">
          <Spinner size="lg" />
          <span>Loading Map...</span>
        </div>
      </div>
    );
  }

  return React.cloneElement(children, { mapReady: true });
};

export default MapWrapper;
