import React, { useEffect, useRef, useState } from 'react';
import { loadMap, getMapProvider } from '../../utils/mapLoader';
import { MapPin, Search, Navigation, Crosshair } from 'lucide-react';
import Spinner from '../ui/Spinner';

export default function RoutePicker({
  initialPickupLat, initialPickupLng, initialPickupAddress,
  initialDropLat, initialDropLng, initialDropAddress,
  onChange,
  height = '400px'
}) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const directionsServiceRef = useRef(null);
  const directionsRendererRef = useRef(null);
  const pickupInputRef = useRef(null);
  const dropInputRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [distance, setDistance] = useState(0);

  const [pickup, setPickup] = useState({
    lat: initialPickupLat || null,
    lng: initialPickupLng || null,
    address: initialPickupAddress || ''
  });

  const [drop, setDrop] = useState({
    lat: initialDropLat || null,
    lng: initialDropLng || null,
    address: initialDropAddress || ''
  });

  const [isLocating, setIsLocating] = useState(false);

  useEffect(() => {
    onChange({ pickup, drop, distance });
  }, [pickup, drop, distance]);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      try {
        await loadMap();
        if (!isMounted || !mapRef.current) return;

        const provider = getMapProvider();

        if (provider === 'google') {
          const map = new window.google.maps.Map(mapRef.current, {
            center: { lat: 28.6139, lng: 77.2090 }, // Default Delhi
            zoom: 11,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
          });

          mapInstanceRef.current = map;
          directionsServiceRef.current = new window.google.maps.DirectionsService();
          directionsRendererRef.current = new window.google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: false,
            polylineOptions: { strokeColor: '#2563EB', strokeWeight: 4 }
          });

          // Setup Autocomplete for Pickup
          if (pickupInputRef.current) {
            const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupInputRef.current);
            pickupAutocomplete.bindTo('bounds', map);
            pickupAutocomplete.addListener('place_changed', () => {
              const place = pickupAutocomplete.getPlace();
              if (!place.geometry) return;
              setPickup({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address || place.name
              });
            });
          }

          // Setup Autocomplete for Drop
          if (dropInputRef.current) {
            const dropAutocomplete = new window.google.maps.places.Autocomplete(dropInputRef.current);
            dropAutocomplete.bindTo('bounds', map);
            dropAutocomplete.addListener('place_changed', () => {
              const place = dropAutocomplete.getPlace();
              if (!place.geometry) return;
              setDrop({
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng(),
                address: place.formatted_address || place.name
              });
            });
          }
        }
        setIsLoading(false);
      } catch (err) {
        if (isMounted) {
          setError(err.message);
          setIsLoading(false);
        }
      }
    }
    init();

    return () => { isMounted = false; };
  }, []);

  // Handle Use Current Location
  const handleCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        if (window.google) {
          const geocoder = new window.google.maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results[0]) {
              setPickup({
                lat,
                lng,
                address: results[0].formatted_address
              });
              if (pickupInputRef.current) {
                pickupInputRef.current.value = results[0].formatted_address;
              }
            }
            setIsLocating(false);
          });
        } else {
          setPickup({ lat, lng, address: 'Current Location' });
          if (pickupInputRef.current) {
            pickupInputRef.current.value = 'Current Location';
          }
          setIsLocating(false);
        }
      },
      () => {
        alert("Unable to retrieve your location");
        setIsLocating(false);
      }
    );
  };

  // Update Route when both pickup and drop exist
  useEffect(() => {
    if (pickup.lat && drop.lat && directionsServiceRef.current && directionsRendererRef.current) {
      directionsServiceRef.current.route({
        origin: { lat: pickup.lat, lng: pickup.lng },
        destination: { lat: drop.lat, lng: drop.lng },
        travelMode: window.google.maps.TravelMode.DRIVING
      }, (response, status) => {
        if (status === 'OK') {
          directionsRendererRef.current.setDirections(response);
          // Calculate distance in km
          const route = response.routes[0];
          if (route && route.legs && route.legs[0]) {
            const distKm = (route.legs[0].distance.value / 1000).toFixed(1);
            setDistance(Number(distKm));
          }
        }
      });
    }
  }, [pickup.lat, drop.lat]);

  if (error) {
    return (
      <div className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center">
        <MapPin className="mx-auto text-gray-400 mb-2" size={24} />
        <p className="text-gray-500 text-sm">Map unavailable</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Inputs Section */}
      <div className="lg:col-span-1 space-y-4">
        <div>
          <div className="flex justify-between items-end mb-1">
            <label className="block text-sm font-semibold text-navy-700">1. Pickup Location</label>
            <button 
              type="button" 
              onClick={handleCurrentLocation}
              disabled={isLocating}
              className="text-xs font-medium text-primary-600 hover:text-primary-700 flex items-center gap-1 disabled:opacity-50"
            >
              {isLocating ? <Spinner size="sm" /> : <Crosshair size={14} />}
              Use Current
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              ref={pickupInputRef}
              type="text"
              placeholder="Search pickup location..."
              defaultValue={pickup.address}
              onChange={(e) => setPickup(p => ({ ...p, address: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-1">2. Drop-off Location</label>
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              ref={dropInputRef}
              type="text"
              placeholder="Search drop-off location..."
              defaultValue={drop.address}
              onChange={(e) => setDrop(p => ({ ...p, address: e.target.value }))}
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary-600 focus:ring-1 focus:ring-primary-600 transition-colors"
            />
          </div>
        </div>

        {distance > 0 && (
          <div className="mt-4 p-4 bg-primary-50 rounded-xl flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
              <Navigation size={20} />
            </div>
            <div>
              <p className="text-sm text-primary-600 font-semibold">Total Distance</p>
              <p className="text-xl font-bold text-navy-900">{distance} km</p>
            </div>
          </div>
        )}
      </div>

      {/* Map Section */}
      <div className="lg:col-span-2 relative rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height }}>
        {isLoading && (
          <div className="absolute inset-0 bg-gray-50 flex items-center justify-center z-10">
            <Spinner size="md" />
          </div>
        )}
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
      </div>
    </div>
  );
}
