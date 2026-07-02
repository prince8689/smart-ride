import React, { useState, useEffect, useRef } from 'react';
import { Navigation, Play, Square, MapPin, AlertTriangle } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import { useDriverSocket } from '../../hooks/useDriverSocket';
import { getAssignedPassengers, updateLocation } from '../../api/driver.api';
import MapWrapper from '../../components/map/MapWrapper';
import DriverLiveMap from '../../components/map/DriverLiveMap';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { haversineDistance } from '../../utils/helpers';

const DriverMap = () => {
  const { user } = useAuth();
  const { updateLocation: emitLocation, isConnected } = useDriverSocket();

  const [passengers, setPassengers] = useState([]);
  const [isTracking, setIsTracking] = useState(false);
  const [locationError, setLocationError] = useState(null);

  const [currentLoc, setCurrentLoc] = useState({
    lat: 20.5937, lng: 78.9629, // Default India center
    accuracy: null, speed: null, lastUpdated: null
  });

  const watchIdRef = useRef(null);

  useEffect(() => {
    const fetchPass = async () => {
      try {
        const res = await getAssignedPassengers();
        const data = res?.data?.subscriptions || res?.data || [];
        setPassengers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPass();

    // Fetch initial location using Google Geolocation API to avoid showing the center of India
    const fetchInitialLocation = async () => {
      try {
        const apiKey = process.env.REACT_APP_GOOGLE_MAPS_KEY;
        if (!apiKey) return;
        const res = await fetch(`https://www.googleapis.com/geolocation/v1/geolocate?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ considerIp: true })
        });
        const data = await res.json();
        if (data && data.location) {
          setCurrentLoc(prev => ({
            ...prev,
            lat: data.location.lat,
            lng: data.location.lng,
            accuracy: data.accuracy ? Math.round(data.accuracy) : null,
            lastUpdated: new Date()
          }));
        }
      } catch (err) {
        console.error('Failed to fetch initial location from Google Geolocation API', err);
      }
    };
    fetchInitialLocation();

    // Cleanup watcher on unmount
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  const handleStartTracking = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setLocationError(null);
    setIsTracking(true);
    toast.success('Requesting precise location...');

    // First try to get the current position to force the permission prompt and get immediate real data
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy, speed } = position.coords;
        setCurrentLoc({
          lat: latitude,
          lng: longitude,
          accuracy: Math.round(accuracy),
          speed: speed ? Math.round(speed * 3.6) : null,
          lastUpdated: new Date()
        });
        
        toast.success('Real location fetched successfully!');

        // Then start watching for continuous updates
        watchIdRef.current = navigator.geolocation.watchPosition(
          async (pos) => {
            const { latitude: lat, longitude: lng, accuracy: acc, speed: spd } = pos.coords;
            setCurrentLoc({
              lat, lng,
              accuracy: Math.round(acc),
              speed: spd ? Math.round(spd * 3.6) : null,
              lastUpdated: new Date()
            });
            emitLocation(lat, lng);
            try { await updateLocation({ lat, lng }); } catch {}
          },
          (err) => console.error('Watch error:', err),
          { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
      },
      (error) => {
        setIsTracking(false);
        const messages = {
          1: 'Location permission denied. Please allow location access in browser settings.',
          2: 'Location unavailable. Check your device GPS signal or location services.',
          3: 'Location request timed out. Retrying...',
        };
        setLocationError(messages[error.code] || 'Location error occurred.');
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const handleStopTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
    toast.info('Location tracking stopped');
  };

  const openNavigation = (lat, lng) => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`, '_blank');
  };

  // Sort passengers by distance if we have current location
  const sortedPassengers = [...passengers].map(p => {
    const pickupLat = p.pickup_lat ? parseFloat(p.pickup_lat) : null;
    const pickupLng = p.pickup_lng ? parseFloat(p.pickup_lng) : null;
    const dist = pickupLat && pickupLng
      ? haversineDistance(
          { lat: currentLoc.lat, lng: currentLoc.lng },
          { lat: pickupLat, lng: pickupLng }
        )
      : null;
    return { ...p, distance: dist };
  }).sort((a, b) => (a.distance || Infinity) - (b.distance || Infinity));

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-6rem)] -m-4 md:-m-8">
      {/* Map Area */}
      <div className="flex-1 relative">
        <MapWrapper>
          <DriverLiveMap lat={currentLoc.lat} lng={currentLoc.lng} passengers={passengers} />
        </MapWrapper>

        {/* Floating Controls Overlay */}
        <div className="absolute top-4 left-4 right-4 md:left-auto md:right-4 md:w-80 space-y-4">
          <Card className="p-4 shadow-lg bg-white/95 backdrop-blur-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-navy-900 flex items-center gap-2">
                <MapPin size={18} className="text-primary-600" />
                Live Broadcast
              </h2>
              <Badge color={isTracking ? 'green' : 'gray'} className={isTracking ? 'animate-pulse' : ''}>
                {isTracking ? 'Broadcasting' : 'Stopped'}
              </Badge>
            </div>

            {/* Location error */}
            {locationError && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 flex items-start gap-2 border border-red-100">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>{locationError}</span>
              </div>
            )}

            {/* Info prompt when not tracking */}
            {!isTracking && !locationError && (
              <div className="bg-blue-50 text-blue-800 p-3 rounded-xl text-xs mb-4">
                Start tracking to let passengers see your live location and get accurate ETA updates.
              </div>
            )}

            {/* Location stats */}
            <div className="space-y-2 mb-4 text-xs text-navy-600 font-medium">
              <div className="flex justify-between">
                <span>Lat / Lng:</span>
                <span className="font-mono">{currentLoc.lat.toFixed(5)}, {currentLoc.lng.toFixed(5)}</span>
              </div>
              <div className="flex justify-between">
                <span>Accuracy:</span>
                <span>{currentLoc.accuracy ? `±${currentLoc.accuracy}m` : 'Detecting...'}</span>
              </div>
              <div className="flex justify-between">
                <span>Speed:</span>
                <span>{currentLoc.speed !== null ? `${currentLoc.speed} km/h` : '0 km/h'}</span>
              </div>
              <div className="flex justify-between">
                <span>Socket:</span>
                <span className={isConnected ? 'text-green-600' : 'text-red-500'}>
                  {isConnected ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              {currentLoc.lastUpdated && (
                <div className="flex justify-between">
                  <span>Updated:</span>
                  <span className="text-navy-400">Just now</span>
                </div>
              )}
            </div>

            {isTracking ? (
              <Button variant="danger" fullWidth onClick={handleStopTracking} leftIcon={<Square size={16} />}>
                Stop Tracking
              </Button>
            ) : (
              <Button fullWidth onClick={handleStartTracking} leftIcon={<Play size={16} />}>
                Start Location Sharing
              </Button>
            )}
          </Card>
        </div>

        {/* Passengers panel */}
        <div className="absolute bottom-4 left-4 right-4 md:top-4 md:bottom-4 md:left-4 md:right-auto md:w-80">
          <Card className="h-full flex flex-col p-0 shadow-lg bg-white/95 backdrop-blur-sm max-h-[40vh] md:max-h-none overflow-hidden">
            <div className="p-3 border-b border-navy-100 bg-navy-50 shrink-0">
              <h3 className="font-bold text-navy-900 text-sm">
                Nearby Pickups ({sortedPassengers.length})
                <span className="text-xs text-navy-400 font-normal ml-2">(green markers)</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {sortedPassengers.length === 0 ? (
                <p className="text-center text-navy-400 text-sm py-4">No passengers assigned</p>
              ) : (
                sortedPassengers.map((p, index) => {
                  const name = p.passenger_name || p.user?.full_name || 'Passenger';
                  const hasCoords = p.pickup_lat && p.pickup_lng;
                  return (
                    <div key={p.id} className="bg-white p-3 rounded-xl border border-navy-100 hover:border-primary-300 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-green-500 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                            {index + 1}
                          </div>
                          <span className="font-bold text-sm text-navy-900">{name}</span>
                        </div>
                        {p.distance !== null && (
                          <span className="text-xs font-bold text-primary-600 bg-primary-50 px-2 py-0.5 rounded">
                            {p.distance < 1 ? `${Math.round(p.distance * 1000)}m` : `${p.distance.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-navy-500 line-clamp-1 mb-3">{p.pickup_address || 'Pickup address not set'}</p>
                      <div className="flex gap-2">
                        {hasCoords && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs py-1 h-auto"
                            onClick={() => openNavigation(p.pickup_lat, p.pickup_lng)}
                          >
                            <Navigation size={12} className="mr-1" /> Navigate
                          </Button>
                        )}
                        {hasCoords && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${p.pickup_lat},${p.pickup_lng}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary-600 font-bold flex items-center gap-1 shrink-0 hover:underline px-2 py-1"
                          >
                            <Navigation size={11} />
                            Go
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default DriverMap;
