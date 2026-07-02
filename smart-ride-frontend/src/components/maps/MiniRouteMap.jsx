import React, { useEffect, useRef, useState } from 'react';
import { loadGoogleMaps } from '../../utils/mapLoader';
import Spinner from '../ui/Spinner';

const MiniRouteMap = ({ startLat, startLng, endLat, endLng }) => {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const directionsRenderer = useRef(null);
  const directionsService = useRef(null);
  const markerRef = useRef(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadGoogleMaps()
      .then((maps) => {
        if (!mapRef.current) return;
        
        mapInstance.current = new maps.Map(mapRef.current, {
          center: { lat: startLat || 25.3176, lng: startLng || 82.9739 },
          zoom: 13,
          disableDefaultUI: true,
          zoomControl: true,
        });

        directionsService.current = new maps.DirectionsService();
        directionsRenderer.current = new maps.DirectionsRenderer({
          map: mapInstance.current,
          suppressMarkers: false,
        });

        setIsLoaded(true);
      })
      .catch((err) => {
        setError(err.message);
      });
  }, []); // Mount only once

  useEffect(() => {
    if (!isLoaded || !directionsService.current || !directionsRenderer.current || !window.google) return;
    
    // Clear any existing manual marker
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }

    if (startLat && startLng && endLat && endLng) {
      const origin = new window.google.maps.LatLng(startLat, startLng);
      const destination = new window.google.maps.LatLng(endLat, endLng);
      
      directionsService.current.route({
        origin,
        destination,
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          directionsRenderer.current.setDirections(result);
        } else {
          console.error("Directions request failed due to " + status);
        }
      });
    } else if (startLat && startLng && mapInstance.current) {
       // Clear directions if any
       directionsRenderer.current.setDirections({ routes: [] });

       mapInstance.current.setCenter({ lat: startLat, lng: startLng });
       mapInstance.current.setZoom(15);
       markerRef.current = new window.google.maps.Marker({
         position: { lat: startLat, lng: startLng },
         map: mapInstance.current,
         title: "Start Location"
       });
    }
  }, [startLat, startLng, endLat, endLng, isLoaded]);

  if (error) {
    return (
      <div className="w-full h-full rounded-xl flex items-center justify-center bg-red-50 text-red-500 min-h-[300px]">
        {error}
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-gray-200 relative z-0" style={{ minHeight: '300px' }}>
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 z-10">
          <Spinner size="md" />
        </div>
      )}
      <div ref={mapRef} style={{ width: '100%', height: '100%', minHeight: '300px' }} />
    </div>
  );
};

export default MiniRouteMap;
