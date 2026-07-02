import React, { useState, useCallback, useEffect, useRef } from 'react';
import { MapPin, Navigation, Loader2, X } from 'lucide-react';
import { loadGoogleMaps } from '../../utils/mapLoader';

/**
 * SmartRouteSelector — Pickup and Drop point selector with Google Places autocomplete.
 *
 * Props:
 *   onPickupSelect(lat, lng, address, place_id)
 *   onDropSelect(lat, lng, address, place_id)
 *   onDistanceCalculated({ distance_km, duration_min })
 *   initialPickup, initialDrop — optional pre-filled addresses
 */
const SmartRouteSelector = ({
  onPickupSelect,
  onDropSelect,
  onDistanceCalculated,
  initialPickup = '',
  initialDrop = '',
}) => {
  const [pickup, setPickup] = useState(initialPickup);
  const [drop, setDrop] = useState(initialDrop);
  const [pickupSuggestions, setPickupSuggestions] = useState([]);
  const [dropSuggestions, setDropSuggestions] = useState([]);
  const [showPickupSuggestions, setShowPickupSuggestions] = useState(false);
  const [showDropSuggestions, setShowDropSuggestions] = useState(false);
  const [isLoadingLocation, setIsLoadingLocation] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null);
  const [selectedPickup, setSelectedPickup] = useState(null);
  const [selectedDrop, setSelectedDrop] = useState(null);

  // Refs for inputs
  const pickupRef = useRef(null);
  const dropRef = useRef(null);

  // Fetch autocomplete suggestions
  const fetchSuggestions = useCallback((input, setSuggestions) => {
    if (input.length < 3) {
      setSuggestions([]);
      return;
    }

    loadGoogleMaps().then((maps) => {
      if (!maps.places) return;
      const service = new maps.places.AutocompleteService();
      service.getPlacePredictions(
        { input, componentRestrictions: { country: 'in' } },
        (predictions, status) => {
          if (status === maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions);
          } else {
            setSuggestions([]);
          }
        }
      );
    }).catch(() => setSuggestions([]));
  }, []);

  // Handle place selection
  const handlePlaceSelect = useCallback((prediction, type) => {
    loadGoogleMaps().then((maps) => {
      const geocoder = new maps.Geocoder();
      geocoder.geocode({ placeId: prediction.place_id }, (results, status) => {
        if (status === 'OK' && results[0]) {
          const place = results[0];
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          const address = place.formatted_address;
          const placeId = prediction.place_id;

          if (type === 'pickup') {
            setPickup(address);
            setSelectedPickup({ lat, lng, address, placeId });
            setShowPickupSuggestions(false);
            if (onPickupSelect) onPickupSelect(lat, lng, address, placeId);
          } else {
            setDrop(address);
            setSelectedDrop({ lat, lng, address, placeId });
            setShowDropSuggestions(false);
            if (onDropSelect) onDropSelect(lat, lng, address, placeId);
          }
        }
      });
    }).catch(console.error);
  }, [onPickupSelect, onDropSelect]);

  // Calculate distance when both points selected
  useEffect(() => {
    if (selectedPickup && selectedDrop) {
      loadGoogleMaps().then((maps) => {
        const directionsService = new maps.DirectionsService();
        directionsService.route(
          {
            origin: { lat: selectedPickup.lat, lng: selectedPickup.lng },
            destination: { lat: selectedDrop.lat, lng: selectedDrop.lng },
            travelMode: maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === 'OK' && result.routes[0]) {
              const leg = result.routes[0].legs[0];
              const info = {
                distance_km: parseFloat((leg.distance.value / 1000).toFixed(2)),
                duration_min: Math.round(leg.duration.value / 60),
                distance_text: leg.distance.text,
                duration_text: leg.duration.text,
              };
              setRouteInfo(info);
              if (onDistanceCalculated) onDistanceCalculated(info);
            }
          }
        );
      }).catch(console.error);
    }
  }, [selectedPickup, selectedDrop, onDistanceCalculated]);

  // Use My Location
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsLoadingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude: lat, longitude: lng } = position.coords;

        loadGoogleMaps().then((maps) => {
          const geocoder = new maps.Geocoder();
          geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            setIsLoadingLocation(false);
            if (status === 'OK' && results[0]) {
              const address = results[0].formatted_address;
              const placeId = results[0].place_id;
              setPickup(address);
              setSelectedPickup({ lat, lng, address, placeId });
              if (onPickupSelect) onPickupSelect(lat, lng, address, placeId);
            } else {
              setPickup(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
              setSelectedPickup({ lat, lng, address: `${lat}, ${lng}`, placeId: '' });
              if (onPickupSelect) onPickupSelect(lat, lng, `${lat}, ${lng}`, '');
            }
          });
        }).catch(() => {
          setIsLoadingLocation(false);
          setPickup(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
          setSelectedPickup({ lat, lng, address: `${lat}, ${lng}`, placeId: '' });
          if (onPickupSelect) onPickupSelect(lat, lng, `${lat}, ${lng}`, '');
        });
      },
      (error) => {
        setIsLoadingLocation(false);
        alert('Unable to get your location. Please enter it manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="space-y-4" id="smart-route-selector">
      {/* Pickup Input */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Pickup Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
          <input
            ref={pickupRef}
            id="pickup-input"
            type="text"
            value={pickup}
            onChange={(e) => {
              setPickup(e.target.value);
              fetchSuggestions(e.target.value, setPickupSuggestions);
              setShowPickupSuggestions(true);
            }}
            onFocus={() => pickupSuggestions.length > 0 && setShowPickupSuggestions(true)}
            onBlur={() => setTimeout(() => setShowPickupSuggestions(false), 200)}
            placeholder="Enter pickup address..."
            className="w-full pl-10 pr-20 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
          />
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isLoadingLocation}
            className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
          >
            {isLoadingLocation ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Navigation className="w-3.5 h-3.5" />}
            {isLoadingLocation ? 'Locating...' : 'My Location'}
          </button>
        </div>

        {/* Pickup Suggestions */}
        {showPickupSuggestions && pickupSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {pickupSuggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={() => handlePlaceSelect(s, 'pickup')}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-start gap-2 text-sm border-b border-gray-50 last:border-0"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Drop Input */}
      <div className="relative">
        <label className="block text-sm font-semibold text-gray-700 mb-1">Drop Location</label>
        <div className="relative">
          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" />
          <input
            ref={dropRef}
            id="drop-input"
            type="text"
            value={drop}
            onChange={(e) => {
              setDrop(e.target.value);
              fetchSuggestions(e.target.value, setDropSuggestions);
              setShowDropSuggestions(true);
            }}
            onFocus={() => dropSuggestions.length > 0 && setShowDropSuggestions(true)}
            onBlur={() => setTimeout(() => setShowDropSuggestions(false), 200)}
            placeholder="Enter drop address..."
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-gray-50 focus:bg-white"
          />
          {drop && (
            <button
              type="button"
              onClick={() => { setDrop(''); setSelectedDrop(null); setRouteInfo(null); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Drop Suggestions */}
        {showDropSuggestions && dropSuggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg max-h-48 overflow-y-auto">
            {dropSuggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={() => handlePlaceSelect(s, 'drop')}
                className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors flex items-start gap-2 text-sm border-b border-gray-50 last:border-0"
              >
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <span className="text-gray-700">{s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Route Info */}
      {routeInfo && (
        <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-blue-700">{routeInfo.distance_text}</p>
            <p className="text-xs text-gray-500 mt-0.5">Distance</p>
          </div>
          <div className="w-px h-10 bg-blue-200" />
          <div className="flex-1 text-center">
            <p className="text-2xl font-bold text-indigo-700">{routeInfo.duration_text}</p>
            <p className="text-xs text-gray-500 mt-0.5">Est. Duration</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartRouteSelector;
