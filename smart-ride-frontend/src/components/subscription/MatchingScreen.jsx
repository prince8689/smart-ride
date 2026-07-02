import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, MapPin, Navigation, Clock, User, Star, ShieldCheck, ArrowRight, Loader2, Info } from 'lucide-react';
import SmartRouteSelector from '../maps/SmartRouteSelector';
import { findMatchingDrivers, confirmSubscriptionDriver } from '../../api/v2.api';
import toast from '../../utils/toastConfig';

const MatchingScreen = ({ onSubscriptionConfirmed }) => {
  const [step, setStep] = useState(1); // 1: Route, 2: Matching/Results
  const [routeData, setRouteData] = useState({
    startLat: null, startLng: null, endLat: null, endLng: null,
    startAddress: '', endAddress: '', distanceKm: null
  });
  const [isSearching, setIsSearching] = useState(false);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [isConfirming, setIsConfirming] = useState(false);

  const handleSearch = async () => {
    if (!routeData.startLat || !routeData.endLat) {
      toast.error('Please select both pickup and drop locations');
      return;
    }
    
    setIsSearching(true);
    setStep(2);
    
    try {
      const res = await findMatchingDrivers({
        startLat: routeData.startLat,
        startLng: routeData.startLng,
        endLat: routeData.endLat,
        endLng: routeData.endLng,
        distanceKm: routeData.distanceKm
      });

      if (res.success) {
        setDrivers(res.data.matches);
      } else {
        toast.error(res.message || 'Failed to find drivers');
        setStep(1);
      }
    } catch (err) {
      toast.error(err.message || 'Search failed');
      setStep(1);
    } finally {
      setIsSearching(false);
    }
  };

  const handleConfirm = async () => {
    if (!selectedDriver) return;

    setIsConfirming(true);
    try {
      const res = await confirmSubscriptionDriver({
        driverId: selectedDriver.driver_id,
        routeId: selectedDriver.route_id,
        matchScore: selectedDriver.match_score,
        routeData
      });

      if (res.success) {
        toast.success('Driver confirmed successfully!');
        if (onSubscriptionConfirmed) onSubscriptionConfirmed(res.data);
      } else {
        toast.error(res.message || 'Failed to confirm driver');
      }
    } catch (err) {
      toast.error(err.message || 'Confirmation failed');
    } finally {
      setIsConfirming(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto" id="matching-screen">
      <AnimatePresence mode="wait">
        {step === 1 ? (
          <motion.div
            key="step1"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="bg-white rounded-3xl shadow-xl shadow-gray-200/50 p-6 sm:p-8 border border-gray-100"
          >
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">Find Your Daily Ride</h2>
              <p className="text-gray-500 mt-2">Enter your route to find matching drivers operating on your schedule.</p>
            </div>

            <SmartRouteSelector
              onPickupSelect={(lat, lng, address) => setRouteData(prev => ({ ...prev, startLat: lat, startLng: lng, startAddress: address }))}
              onDropSelect={(lat, lng, address) => setRouteData(prev => ({ ...prev, endLat: lat, endLng: lng, endAddress: address }))}
              onDistanceCalculated={(info) => setRouteData(prev => ({ ...prev, distanceKm: info.distance_km }))}
            />

            <button
              onClick={handleSearch}
              disabled={!routeData.startLat || !routeData.endLat}
              className="w-full mt-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2"
            >
              Search Drivers <ArrowRight className="w-5 h-5" />
            </button>
          </motion.div>
        ) : (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
              <div>
                <button onClick={() => setStep(1)} className="text-sm text-blue-600 font-medium hover:underline mb-1 inline-block">
                  &larr; Change Route
                </button>
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="truncate max-w-[120px]">{routeData.startAddress.split(',')[0]}</span>
                  <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  <span className="truncate max-w-[120px]">{routeData.endAddress.split(',')[0]}</span>
                </div>
              </div>
              {isSearching ? (
                <div className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Searching...
                </div>
              ) : (
                <div className="bg-emerald-50 text-emerald-600 px-3 py-1.5 rounded-lg text-sm font-bold">
                  {drivers.length} found
                </div>
              )}
            </div>

            {/* Results */}
            {isSearching ? (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="relative w-24 h-24 mx-auto mb-6">
                  <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
                  <div className="relative w-24 h-24 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
                    <Navigation className="w-10 h-10 text-white animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-gray-800">Finding best matches...</h3>
                <p className="text-gray-500 mt-2">Analyzing routes, schedules, and detours.</p>
              </div>
            ) : drivers.length > 0 ? (
              <div className="space-y-4">
                {drivers.map((driver, idx) => (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.1 }}
                    key={driver.route_id}
                    onClick={() => setSelectedDriver(driver)}
                    className={`bg-white rounded-3xl p-5 sm:p-6 border-2 transition-all cursor-pointer ${
                      selectedDriver?.driver_id === driver.driver_id
                        ? 'border-blue-500 shadow-md shadow-blue-100 bg-blue-50/30'
                        : 'border-gray-100 hover:border-blue-200 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row gap-5">
                      {/* Driver Avatar & Basic Info */}
                      <div className="flex items-center sm:flex-col sm:w-24 flex-shrink-0 gap-4 sm:gap-2 text-center">
                        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center shadow-inner overflow-hidden border-2 border-white">
                           <User className="w-8 h-8 text-gray-400" />
                        </div>
                        <div className="text-left sm:text-center">
                           <p className="font-bold text-gray-900 leading-tight">{driver.driver_name || 'Driver'}</p>
                           <div className="flex items-center gap-1 mt-1 sm:justify-center">
                             <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                             <span className="text-xs font-bold text-gray-700">4.8</span>
                           </div>
                        </div>
                      </div>

                      {/* Match Details */}
                      <div className="flex-1 space-y-4">
                        {/* Tags */}
                        <div className="flex flex-wrap gap-2">
                          <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                            driver.match_score >= 80 ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {driver.match_score}% Match
                          </span>
                          <span className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-lg text-xs font-bold capitalize">
                            {driver.vehicle_type}
                          </span>
                        </div>

                        {/* Route Info */}
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="space-y-1">
                            <p className="text-gray-500 text-xs flex items-center gap-1"><Navigation className="w-3 h-3"/> Detour</p>
                            <p className="font-semibold text-gray-800">+{driver.pickup_detour_km + driver.drop_detour_km} km total</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-500 text-xs flex items-center gap-1"><Clock className="w-3 h-3"/> Schedule</p>
                            <p className="font-semibold text-gray-800">{driver.morning_time} & {driver.evening_time}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Confirm Button */}
                <AnimatePresence>
                  {selectedDriver && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      className="sticky bottom-4 z-10"
                    >
                      <button
                        onClick={handleConfirm}
                        disabled={isConfirming}
                        className="w-full py-4 bg-gray-900 text-white font-bold rounded-2xl shadow-xl hover:shadow-2xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isConfirming ? (
                          <><Loader2 className="w-5 h-5 animate-spin" /> Confirming...</>
                        ) : (
                          <>Confirm Driver <ArrowRight className="w-5 h-5" /></>
                        )}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Info className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-800">No matching drivers found</h3>
                <p className="text-gray-500 mt-2 text-sm">We couldn't find any drivers whose route matches yours closely enough. Try adjusting your drop location slightly.</p>
                <button onClick={() => setStep(1)} className="mt-6 px-6 py-2 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800">
                  Adjust Route
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default MatchingScreen;
