import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ChevronDown, ChevronUp, Sparkles, TrendingDown, Check } from 'lucide-react';
import { calculateV2Pricing } from '../../api/v2.api';
import toast from '../../utils/toastConfig';

/**
 * PricingCalculator — Calls V2 pricing API and displays 4 plan cards.
 *
 * Props:
 *   distanceKm: number
 *   vehicleType: string
 *   pickupTime: string (HH:mm)
 *   trafficLevel: string
 *   onPlanSelect(plan): callback when user selects a plan
 */
const PricingCalculator = ({ distanceKm, vehicleType, pickupTime, trafficLevel = 'light', onPlanSelect }) => {
  const [pricing, setPricing] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showBreakdown, setShowBreakdown] = useState(false);

  const calculatePricing = async () => {
    if (!distanceKm || !vehicleType) {
      toast.error('Please select route and vehicle first');
      return;
    }

    setIsLoading(true);
    try {
      const res = await calculateV2Pricing({
        distanceKm,
        vehicleType,
        pickupTime,
        trafficLevel,
      });

      if (res.success) {
        setPricing(res.data);
      } else {
        toast.error(res.message || 'Failed to calculate pricing');
      }
    } catch (err) {
      toast.error(err.message || 'Failed to calculate pricing');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlanSelect = (planKey, planData) => {
    setSelectedPlan(planKey);
    if (onPlanSelect) onPlanSelect({ key: planKey, ...planData });
  };

  const planConfig = {
    monthly: { label: 'Monthly', icon: '📅', color: 'from-slate-500 to-slate-700', months: 1 },
    quarterly: { label: 'Quarterly', icon: '📊', color: 'from-blue-500 to-blue-700', months: 3 },
    half_yearly: { label: 'Half-Yearly', icon: '⏳', color: 'from-purple-500 to-purple-700', months: 6 },
    yearly: { label: 'Yearly', icon: '🏆', color: 'from-amber-500 to-amber-600', months: 12, bestValue: true },
  };

  const formatCurrency = (amount) => `₹${Number(amount).toLocaleString('en-IN')}`;

  return (
    <div className="space-y-4" id="pricing-calculator">
      {/* Calculate Button */}
      {!pricing && (
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={calculatePricing}
          disabled={isLoading || !distanceKm || !vehicleType}
          className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <CreditCard className="w-5 h-5" />
              Calculate Subscription Pricing
            </>
          )}
        </motion.button>
      )}

      {/* Plan Cards */}
      <AnimatePresence>
        {pricing && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-3"
          >
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-500" />
              Choose Your Plan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(pricing.plans).map(([key, plan]) => {
                const config = planConfig[key];
                const isSelected = selectedPlan === key;

                return (
                  <motion.div
                    key={key}
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handlePlanSelect(key, plan)}
                    className={`relative cursor-pointer rounded-2xl p-5 border-2 transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50 shadow-lg shadow-blue-100'
                        : 'border-gray-100 bg-white hover:border-gray-200 hover:shadow-md'
                    }`}
                  >
                    {/* Best Value Badge */}
                    {config.bestValue && (
                      <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold rounded-full uppercase tracking-wider shadow-md">
                        Best Value
                      </div>
                    )}

                    {/* Selected Checkmark */}
                    {isSelected && (
                      <div className="absolute top-3 right-3 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    )}

                    {/* Plan Header */}
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl">{config.icon}</span>
                      <div>
                        <h4 className="font-bold text-gray-800">{config.label}</h4>
                        <p className="text-xs text-gray-500">{config.months} month{config.months > 1 ? 's' : ''}</p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="mb-2">
                      <span className="text-3xl font-extrabold text-gray-900">{formatCurrency(plan.price)}</span>
                      <span className="text-sm text-gray-500 ml-1">
                        / {config.months > 1 ? `${config.months} months` : 'month'}
                      </span>
                    </div>

                    {/* Per Month Price */}
                    {config.months > 1 && (
                      <p className="text-xs text-gray-500 mb-2">
                        {formatCurrency(Math.round(plan.price / config.months))}/month
                      </p>
                    )}

                    {/* Savings */}
                    {plan.savings > 0 && (
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-semibold w-fit">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Save {formatCurrency(plan.savings)} ({plan.savings_percent}%)
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>

            {/* Cost Breakdown */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setShowBreakdown(!showBreakdown)}
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
              >
                {showBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                Cost Breakdown
              </button>

              <AnimatePresence>
                {showBreakdown && pricing.breakdown && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 p-4 bg-gray-50 rounded-xl space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Distance</span>
                        <span className="font-medium">{pricing.breakdown.distance_km} km (one way)</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Vehicle</span>
                        <span className="font-medium capitalize">{pricing.breakdown.vehicle_type}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Base Cost (round trip/day)</span>
                        <span className="font-medium">{formatCurrency(pricing.breakdown.base_cost)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Peak Hour Multiplier</span>
                        <span className="font-medium">{pricing.breakdown.peak_adjustment}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Traffic Multiplier</span>
                        <span className="font-medium">{pricing.breakdown.traffic_adjustment}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Platform Commission</span>
                        <span className="font-medium">{formatCurrency(pricing.breakdown.commission)}</span>
                      </div>
                      <div className="border-t border-gray-200 pt-2 flex justify-between">
                        <span className="text-gray-700 font-semibold">Daily Total</span>
                        <span className="font-bold text-gray-900">{formatCurrency(pricing.breakdown.daily_cost)}</span>
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Working days/month</span>
                        <span>{pricing.breakdown.working_days_per_month}</span>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Recalculate Button */}
            <button
              type="button"
              onClick={() => { setPricing(null); setSelectedPlan(null); }}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              ↻ Recalculate
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PricingCalculator;
