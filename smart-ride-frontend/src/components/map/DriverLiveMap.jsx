import React, { useEffect, useRef } from 'react';
import { MAP_PROVIDER } from '../../utils/constants';

const DriverLiveMap = ({ lat, lng, passengers = [], mapReady }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const driverMarkerRef = useRef(null);
  const passengerMarkersRef = useRef([]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    if (MAP_PROVIDER === 'google' && window.google) {
      if (!mapInstance.current) {
        mapInstance.current = new window.google.maps.Map(mapRef.current, {
          zoom: 14,
          center: { lat, lng },
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });

        // Driver marker with custom SVG
        driverMarkerRef.current = new window.google.maps.Marker({
          position: { lat, lng },
          map: mapInstance.current,
          icon: {
            url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="18" fill="#2563EB" stroke="white" stroke-width="2"/>
                <text x="20" y="26" text-anchor="middle" fill="white" font-size="18">🚗</text>
              </svg>
            `),
            scaledSize: new window.google.maps.Size(40, 40),
            anchor: new window.google.maps.Point(20, 20),
          },
          zIndex: 100
        });
      }

      // Render/Update Passenger Markers
      // Clear old passenger markers
      passengerMarkersRef.current.forEach(m => m.setMap(null));
      passengerMarkersRef.current = [];

      passengers.forEach((p, index) => {
        if (p.pickup_lat && p.pickup_lng) {
          const m = new window.google.maps.Marker({
            position: { lat: parseFloat(p.pickup_lat), lng: parseFloat(p.pickup_lng) },
            map: mapInstance.current,
            icon: {
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 12,
              fillColor: '#10B981', // Green
              fillOpacity: 1,
              strokeWeight: 2,
              strokeColor: '#ffffff'
            },
            label: { text: (index + 1).toString(), color: 'white', fontWeight: 'bold' },
            title: p.user?.full_name || 'Passenger'
          });
          passengerMarkersRef.current.push(m);
        }
      });

    } else if (MAP_PROVIDER === 'mappls' && window.mappls) {
      // Mappls placeholder logic
      if (!mapInstance.current) {
        mapInstance.current = new window.mappls.Map(mapRef.current, {
          center: [lat, lng],
          zoom: 14,
        });
        
        driverMarkerRef.current = new window.mappls.Marker({
          map: mapInstance.current,
          position: { lat, lng }
        });
      }
    }

    return () => {
      // Cleanup markers on unmount or re-render to avoid memory leaks
      passengerMarkersRef.current.forEach(m => m.setMap(null));
    };
  }, [mapReady, passengers]); // Re-run when map becomes ready or passengers list changes

  // Separate effect to smoothly move driver marker without re-rendering everything
  useEffect(() => {
    if (mapReady && driverMarkerRef.current && window.google) {
      const newPos = new window.google.maps.LatLng(lat, lng);
      driverMarkerRef.current.setPosition(newPos);
      mapInstance.current?.panTo(newPos);
    }

    return () => {
      // Cleanup driver marker on unmount
      if (driverMarkerRef.current) {
        // We only clear the map reference if component is completely unmounting,
        // but for safety, we leave it since we're reusing it.
      }
    };
  }, [lat, lng, mapReady]);

  return (
    <div 
      ref={mapRef} 
      className="w-full h-full bg-navy-100 relative"
    >
      {/* Fallback Pulse animation if map isn't loaded yet but we have coordinates */}
      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex justify-center items-center">
            <div className="absolute animate-ping w-16 h-16 rounded-full bg-primary-400 opacity-75"></div>
            <div className="relative w-8 h-8 rounded-full bg-primary-600 border-2 border-white flex items-center justify-center shadow-lg text-white text-xs">🚗</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverLiveMap;
