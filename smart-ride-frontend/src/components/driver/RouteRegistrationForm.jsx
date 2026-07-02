import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MapPin, Clock, Car, ChevronRight, ChevronLeft, Check, Loader2 } from 'lucide-react';
import SmartRouteSelector from '../maps/SmartRouteSelector';
import MiniRouteMap from '../maps/MiniRouteMap';
import { registerDriverRoute } from '../../api/v2.api';
import toast from '../../utils/toastConfig';

const STEPS = ['Route', 'Schedule', 'Vehicle', 'Review'];

const DAYS = [
  { value: 0, label: 'Sun' },
  { value: 1, label: 'Mon' },
  { value: 2, label: 'Tue' },
  { value: 3, label: 'Wed' },
  { value: 4, label: 'Thu' },
  { value: 5, label: 'Fri' },
  { value: 6, label: 'Sat' },
];

const VEHICLE_TYPES = [
  { value: 'sedan', label: 'Sedan', icon: '🚗', desc: '4 seats' },
  { value: 'suv', label: 'SUV', icon: '🚙', desc: '6 seats' },
  { value: 'minivan', label: 'Minivan', icon: '🚐', desc: '8 seats' },
  { value: 'bus', label: 'Bus', icon: '🚌', desc: '20+ seats' },
];

const RouteRegistrationForm = ({ onSuccess }) => {
  const [step, setStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    startAddress: '',
    endAddress: '',
    startLat: null, startLng: null, startPlaceId: '',
    endLat: null, endLng: null, endPlaceId: '',
    distanceKm: null,
    durationMin: null,
    workingDays: [1, 2, 3, 4, 5],
    morningTime: '08:00',
    eveningTime: '18:00',
    vehicleType: 'sedan',
    vehicleCapacity: 4,
  });

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleDay = (day) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day].sort(),
    }));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await registerDriverRoute({
        startAddress: formData.startAddress,
        endAddress: formData.endAddress,
        workingDays: formData.workingDays,
        morningTime: formData.morningTime,
        eveningTime: formData.eveningTime,
        vehicleType: formData.vehicleType,
        vehicleCapacity: formData.vehicleCapacity,
      });

      if (res.success) {
        toast.success('Route registered successfully!');
        if (onSuccess) onSuccess(res.data);
      } else {
        toast.error(res.message || 'Registration failed');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to register route');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return formData.startAddress && formData.endAddress;
      case 1: return formData.workingDays.length > 0 && formData.morningTime;
      case 2: return formData.vehicleType && formData.vehicleCapacity > 0;
      default: return true;
    }
  };

  const generateWaypoints = () => {
    if (!formData.durationMin || !formData.morningTime || !formData.startAddress || !formData.endAddress || !formData.distanceKm) return null;
    
    // Parse start time
    const [hours, minutes] = formData.morningTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    // 1 waypoint per km approx
    const distanceInt = Math.floor(formData.distanceKm);
    const numIntermediateStops = Math.max(0, distanceInt - 1);
    
    // Total segments
    const numSegments = numIntermediateStops + 1;
    const stopDuration = formData.durationMin / numSegments;
    
    const formatTime = (d) => d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    const getShortAddress = (addr) => (addr || '').split(',')[0].substring(0, 20) + '...';
    const startShort = getShortAddress(formData.startAddress);
    const endShort = getShortAddress(formData.endAddress);
    
    const intermediateStops = [];
    for (let i = 1; i <= numIntermediateStops; i++) {
      const timeAtStop = new Date(startDate.getTime() + (stopDuration * i * 60000));
      intermediateStops.push({
        id: i,
        time: formatTime(timeAtStop),
        title: `Waypoint ${i}`,
        desc: i <= (numIntermediateStops / 2) ? `Sector near ${startShort}` : `Route towards ${endShort}`
      });
    }

    const timeAtEnd = new Date(startDate.getTime() + formData.durationMin * 60000);
    
    return (
      <div className="mt-6 pt-6 border-t border-gray-100">
        <h4 className="font-bold text-gray-800 mb-4">Generated Route Waypoints (Estimates)</h4>
        <div className="relative pl-6 space-y-6">
          <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-blue-100"></div>
          
          <div className="relative">
            <div className="absolute -left-[29px] top-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white shadow-sm"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800 text-sm">Start Point</p>
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{formData.startAddress}</p>
              </div>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">{formatTime(startDate)}</span>
            </div>
          </div>
          
          {intermediateStops.map((stop) => (
            <div key={stop.id} className="relative">
              <div className="absolute -left-[29px] top-1 w-4 h-4 bg-blue-400 rounded-full border-2 border-white shadow-sm"></div>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-bold text-gray-800 text-sm">{stop.title}</p>
                  <p className="text-xs text-gray-500">{stop.desc} (~{stop.id}km)</p>
                </div>
                <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">{stop.time}</span>
              </div>
            </div>
          ))}
          
          <div className="relative">
            <div className="absolute -left-[29px] top-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm"></div>
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-800 text-sm">End Point</p>
                <p className="text-xs text-gray-500 truncate max-w-[200px]">{formData.endAddress}</p>
              </div>
              <span className="font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs">{formatTime(timeAtEnd)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden" id="route-registration-form">
      {/* Progress Steps */}
      <div className="px-6 pt-6 pb-4">
        <div className="flex items-center justify-between">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-all ${
                i < step ? 'bg-emerald-500 text-white' :
                i === step ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' :
                'bg-gray-100 text-gray-400'
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className={`ml-2 text-sm font-medium hidden sm:block ${
                i === step ? 'text-blue-600' : 'text-gray-400'
              }`}>{label}</span>
              {i < STEPS.length - 1 && (
                <div className={`w-8 sm:w-16 h-0.5 mx-2 ${i < step ? 'bg-emerald-400' : 'bg-gray-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-6 pb-6">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {/* Step 0: Route Details */}
          {step === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-500" /> Route Details
                </h3>
                <SmartRouteSelector
                  onPickupSelect={(lat, lng, address, placeId) => {
                    updateField('startLat', lat);
                    updateField('startLng', lng);
                    updateField('startAddress', address);
                    updateField('startPlaceId', placeId);
                  }}
                  onDropSelect={(lat, lng, address, placeId) => {
                    updateField('endLat', lat);
                    updateField('endLng', lng);
                    updateField('endAddress', address);
                    updateField('endPlaceId', placeId);
                  }}
                  onDistanceCalculated={(info) => {
                    updateField('distanceKm', info.distance_km);
                    updateField('durationMin', info.duration_min);
                  }}
                />
              </div>
              <div className="h-full min-h-[300px] mt-8 md:mt-0">
                <MiniRouteMap 
                  startLat={formData.startLat} startLng={formData.startLng}
                  endLat={formData.endLat} endLng={formData.endLng}
                />
              </div>
            </div>
          )}

          {/* Step 1: Schedule */}
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Clock className="w-5 h-5 text-blue-500" /> Schedule
              </h3>

              {/* Working Days */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Working Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleDay(value)}
                      className={`w-12 h-12 rounded-xl text-sm font-bold transition-all ${
                        formData.workingDays.includes(value)
                          ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time Pickers */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Shift Start Time</label>
                  <input
                    type="time"
                    value={formData.morningTime}
                    onChange={(e) => updateField('morningTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Shift End Time</label>
                  <input
                    type="time"
                    value={formData.eveningTime}
                    onChange={(e) => updateField('eveningTime', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Vehicle Info */}
          {step === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Car className="w-5 h-5 text-blue-500" /> Vehicle Information
              </h3>

              <div className="grid grid-cols-2 gap-3">
                {VEHICLE_TYPES.map(({ value, label, icon, desc }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      updateField('vehicleType', value);
                      const defaultCapacity = { sedan: 4, suv: 6, minivan: 8, bus: 20 };
                      updateField('vehicleCapacity', defaultCapacity[value] || 4);
                    }}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      formData.vehicleType === value
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-100 hover:border-gray-200'
                    }`}
                  >
                    <span className="text-3xl">{icon}</span>
                    <p className="font-bold text-gray-800 mt-2">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">Seating Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={formData.vehicleCapacity}
                  onChange={(e) => updateField('vehicleCapacity', parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 focus:bg-white"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-bold text-gray-800">Review Your Route</h3>

              <div className="space-y-3 p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">From</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{formData.startAddress}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">To</span>
                  <span className="font-medium text-gray-800 text-right max-w-[60%] truncate">{formData.endAddress}</span>
                </div>
                {formData.distanceKm && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Distance</span>
                    <span className="font-medium">{formData.distanceKm} km</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Working Days</span>
                  <span className="font-medium">
                    {formData.workingDays.map(d => DAYS.find(day => day.value === d)?.label).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Schedule</span>
                  <span className="font-medium">{formData.morningTime} / {formData.eveningTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Vehicle</span>
                  <span className="font-medium capitalize">{formData.vehicleType} ({formData.vehicleCapacity} seats)</span>
                </div>
              </div>
              {generateWaypoints()}
            </div>
          )}
        </motion.div>

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </button>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="flex items-center gap-1 px-6 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-semibold rounded-xl shadow-lg hover:shadow-xl disabled:opacity-50 transition-all"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isSubmitting ? 'Registering...' : 'Register Route'}
            </motion.button>
          )}
        </div>
      </div>
    </div>
  );
};

export default RouteRegistrationForm;
