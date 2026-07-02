import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle, ChevronRight, ChevronLeft, Sun, Moon, MapPin, Car } from 'lucide-react'
import toast from 'react-hot-toast'
import { createSubscription } from '../../api/subscription.api'
import { calculatePricing, getPricingConfig } from '../../api/pricing.api'
import { createManualPayment } from '../../api/payment.api'
import { uploadFile } from '../../api/upload.api'
import { useAuth } from '../../hooks/useAuth'
import Button from '../../components/ui/Button'
import Card from '../../components/ui/Card'
import RoutePicker from '../../components/map/RoutePicker'
import Spinner from '../../components/ui/Spinner'
import { RAZORPAY_KEY_ID } from '../../utils/constants'
import { formatCurrency } from '../../utils/helpers'

// Haversine formula to estimate distance
function getDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return (d * 1.3).toFixed(1); // Adding 30% for driving route curvature
}

// Step indicator
function StepIndicator({ currentStep }) {
  const steps = ['Route', 'Schedule', 'Packages', 'Payment']
  return (
    <div className="flex items-center justify-center mb-8">
      {steps.map((step, index) => (
        <React.Fragment key={step}>
          <div className="flex flex-col items-center">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
              index < currentStep ? 'bg-primary-600 text-white' : index === currentStep ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-gray-100 text-gray-400'
            }`}>
              {index < currentStep ? <CheckCircle size={18} /> : index + 1}
            </div>
            <span className={`text-xs mt-1 font-medium hidden sm:block ${index === currentStep ? 'text-primary-600' : 'text-gray-400'}`}>{step}</span>
          </div>
          {index < steps.length - 1 && (
            <div className={`h-0.5 w-12 sm:w-20 mx-1 transition-all duration-300 ${index < currentStep ? 'bg-primary-600' : 'bg-gray-200'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  )
}

// STEP 1: Locations
function Step1Location({ details, setDetails, onNext }) {
  const isValid = details.pickup_lat && details.drop_lat;
  
  const handleRouteUpdate = ({ pickup, drop, distance }) => {
    setDetails(prev => ({
      ...prev,
      pickup_lat: pickup.lat,
      pickup_lng: pickup.lng,
      pickup_address: pickup.address,
      drop_lat: drop.lat,
      drop_lng: drop.lng,
      drop_address: drop.address,
      distance_km: distance || prev.distance_km // If distance is calculated by RoutePicker use it
    }));
  };

  const handleNext = () => {
    // If distance wasn't calculated by Google Maps directions, use Haversine fallback
    if (!details.distance_km) {
       const dist = getDistance(details.pickup_lat, details.pickup_lng, details.drop_lat, details.drop_lng);
       setDetails(prev => ({ ...prev, distance_km: dist }));
    }
    onNext();
  };

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-900 mb-2">Pin Your Route</h2>
      <p className="text-gray-500 mb-6">Search your daily pickup and drop-off locations</p>

      <RoutePicker 
        initialPickupLat={details.pickup_lat}
        initialPickupLng={details.pickup_lng}
        initialPickupAddress={details.pickup_address}
        initialDropLat={details.drop_lat}
        initialDropLng={details.drop_lng}
        initialDropAddress={details.drop_address}
        onChange={handleRouteUpdate}
        height="350px"
      />

      <div className="flex justify-end mt-8">
        <Button variant="primary" size="lg" disabled={!isValid} onClick={handleNext} rightIcon={<ChevronRight size={18} />}>
          Calculate Distance & Next
        </Button>
      </div>
    </div>
  )
}

// STEP 2: Schedule & Vehicle
function Step2Schedule({ details, setDetails, onNext, onBack }) {
  const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];
  const isValid = details.start_date && (details.morning_slot || details.evening_slot) && 
    (!details.morning_slot || details.pickup_time) && 
    (!details.evening_slot || details.return_time);

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-900 mb-2">Set Your Schedule</h2>
      <p className="text-gray-500 mb-6">Estimated Distance: <span className="font-bold text-primary-600">{details.distance_km} km</span></p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1">Start Date</label>
            <input type="date" min={minDate} value={details.start_date} onChange={e => setDetails(f => ({ ...f, start_date: e.target.value }))} className="w-full border border-gray-200 rounded-xl px-4 py-3 focus:border-primary-600" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-navy-700 mb-1">Trip Type & Timing</label>
            <p className="text-xs text-gray-500 mb-3">Select both slots for a Round Trip, or only one for a One-Way subscription.</p>
            <div className="grid grid-cols-1 gap-4">
              <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${details.morning_slot ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setDetails(f => ({ ...f, morning_slot: !f.morning_slot }))}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${details.morning_slot ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Sun size={20} />
                  </div>
                  <span className="font-medium">Morning Pickup</span>
                </div>
                {details.morning_slot && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-medium">Time:</label>
                    <input 
                      type="time" 
                      value={details.pickup_time} 
                      onChange={e => setDetails(f => ({ ...f, pickup_time: e.target.value }))}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:border-primary-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>
              
              <div className={`p-4 rounded-xl border-2 flex items-center justify-between transition-colors ${details.evening_slot ? 'border-primary-600 bg-primary-50' : 'border-gray-200'}`}>
                <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setDetails(f => ({ ...f, evening_slot: !f.evening_slot }))}>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${details.evening_slot ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'}`}>
                    <Moon size={20} />
                  </div>
                  <span className="font-medium">Evening Return</span>
                </div>
                {details.evening_slot && (
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 font-medium">Time:</label>
                    <input 
                      type="time" 
                      value={details.return_time} 
                      onChange={e => setDetails(f => ({ ...f, return_time: e.target.value }))}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-sm focus:border-primary-600 focus:outline-none"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-navy-700 mb-3">Vehicle Details</label>
          <div className="p-4 border border-blue-100 bg-blue-50 rounded-xl flex items-start gap-4">
            <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100 text-blue-600 flex-shrink-0">
              <Car size={20} />
            </div>
            <div>
              <h4 className="font-bold text-blue-900 mb-1">Vehicle Assigned by Availability</h4>
              <p className="text-xs text-blue-700">A suitable vehicle will be assigned to you when a driver becomes available based on your route and schedule.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={onBack} leftIcon={<ChevronLeft size={18} />}>Back</Button>
        <Button variant="primary" size="lg" disabled={!isValid} onClick={onNext} rightIcon={<ChevronRight size={18} />}>Next: See Packages</Button>
      </div>
    </div>
  )
}

// STEP 3: Auto-Generated Packages
function Step3Packages({ details, setDetails, onNext, onBack }) {
  const [loading, setLoading] = useState(true);
  const [packages, setPackages] = useState(null);

  useEffect(() => {
    const validVehicleType = ['sedan', 'suv', 'hatchback', 'van', 'mini_bus', 'bus'].includes(details.vehicle_type) 
      ? details.vehicle_type 
      : 'hatchback';
      
    const tripType = (details.morning_slot && details.evening_slot) ? 'round_trip' : 'one_way';
      
    calculatePricing(details.distance_km, validVehicleType, tripType)
      .then(res => {
        const pkgs = res?.data?.packages || res?.packages;
        setPackages(pkgs);
      })
      .catch(err => toast.error('Failed to calculate pricing'))
      .finally(() => setLoading(false))
  }, [details.distance_km, details.vehicle_type, details.morning_slot, details.evening_slot]);

  if (loading) return <div className="flex justify-center py-16"><Spinner size="lg" /></div>;

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-900 mb-2">Select Your Package</h2>
      <p className="text-gray-500 mb-6">Dynamically calculated for {details.distance_km}km</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {packages && Object.keys(packages).map((key, i) => {
          const pkg = packages[key];
          const isSelected = details.plan_type === key;
          
          return (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => setDetails(p => ({...p, plan_type: key, plan_price: pkg.total, plan_duration: pkg.duration_days}))}
              className={`relative cursor-pointer rounded-2xl border-2 p-5 transition-all duration-200 ${isSelected ? 'border-primary-600 bg-primary-50 shadow-lg' : 'border-gray-200 bg-white hover:border-primary-300'}`}
            >
              {pkg.savings_text && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {pkg.savings_text}
                </div>
              )}
              <h3 className="font-bold text-navy-900 text-lg mb-1 capitalize">{key.replace('_', ' ')}</h3>
              <div className="mb-4">
                <span className="text-2xl font-bold text-primary-600">{formatCurrency(pkg.total)}</span>
              </div>
              <p className="text-xs text-gray-500 mb-1">{pkg.duration_days} Days validity</p>
              <p className="text-xs text-gray-400">Includes GST</p>
              {isSelected && <div className="absolute top-4 right-4 w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center"><CheckCircle size={14} className="text-white" /></div>}
            </motion.div>
          )
        })}
      </div>

      <div className="flex justify-between">
        <Button variant="outline" size="lg" onClick={onBack} leftIcon={<ChevronLeft size={18} />}>Back</Button>
        <Button variant="primary" size="lg" disabled={!details.plan_type} onClick={onNext} rightIcon={<ChevronRight size={18} />}>Next: Payment</Button>
      </div>
    </div>
  )
}

// STEP 4: Payment
function Step4Payment({ details, onBack }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [adminUpi, setAdminUpi] = useState('smartride@upi');
  const [receiptFile, setReceiptFile] = useState(null);
  const [receiptPreview, setReceiptPreview] = useState(null);

  useEffect(() => {
    getPricingConfig().then(res => {
      if (res.data?.admin_upi_id) setAdminUpi(res.data.admin_upi_id);
    }).catch(e => console.error(e));
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setReceiptFile(file);
      setReceiptPreview(URL.createObjectURL(file));
    }
  };

  async function handlePayment() {
    if (!receiptFile) {
      toast.error('Please upload your payment receipt');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Create Subscription
      const subRes = await createSubscription({
        distance_km: details.distance_km,
        plan_type: details.plan_type,
        vehicle_type: details.vehicle_type,
        duration_days: details.plan_duration,
        pickup_address: details.pickup_address,
        pickup_lat: details.pickup_lat,
        pickup_lng: details.pickup_lng,
        drop_address: details.drop_address,
        drop_lat: details.drop_lat,
        drop_lng: details.drop_lng,
        start_date: details.start_date,
        morning_slot: details.morning_slot,
        evening_slot: details.evening_slot,
        morning_pickup_time: details.morning_slot ? details.pickup_time : null,
        evening_return_time: details.evening_slot ? details.return_time : null
      });

      const subscriptionPlanId = subRes.data.id || subRes.data?.data?.id || (subRes.data && subRes.data[0]?.id) || subRes.data?.subscription?.id;
      if (!subscriptionPlanId) throw new Error('Subscription creation failed');

      // 2. Upload Receipt
      const uploadRes = await uploadFile(receiptFile);
      const fileUrl = uploadRes.data?.url || uploadRes.data?.data?.url;
      if (!fileUrl) throw new Error('Receipt upload failed');

      // 3. Create Manual Payment
      await createManualPayment({
        subscription_plan_id: subscriptionPlanId,
        payment_receipt_url: fileUrl
      });
      
      setSuccess(true);
      toast.success('Payment submitted for admin approval!');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Error processing payment.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle size={40} className="text-yellow-600" />
        </div>
        <h2 className="text-2xl font-bold text-navy-900 mb-2">Payment Under Verification!</h2>
        <p className="text-gray-500 mb-6">Your receipt has been submitted successfully. Admin will approve it shortly.</p>
        <div className="flex gap-3 justify-center">
          <Button variant="primary" onClick={() => navigate('/dashboard/subscriptions')}>View My Subscriptions</Button>
          <Button variant="outline" onClick={() => navigate('/dashboard')}>Dashboard</Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-navy-900 mb-2">Complete Payment</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="font-bold text-navy-900 mb-4">Order Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Distance</span><span className="font-medium">{details.distance_km} km</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Package</span><span className="font-medium capitalize">{details.plan_type}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Vehicle</span><span className="font-medium text-xs text-right max-w-[150px]">Assigned by Availability</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Start Date</span><span className="font-medium">{details.start_date}</span></div>
            {details.morning_slot && <div className="flex justify-between"><span className="text-gray-500">Morning Pickup</span><span className="font-medium">{details.pickup_time}</span></div>}
            {details.evening_slot && <div className="flex justify-between"><span className="text-gray-500">Evening Return</span><span className="font-medium">{details.return_time}</span></div>}
            <div className="border-t pt-3 mt-3 flex justify-between font-bold text-base">
              <span>Total (Inc GST)</span><span className="text-primary-600">{formatCurrency(details.plan_price)}</span>
            </div>
          </div>
        </Card>
        
        <div className="flex flex-col">
          <Card className="mb-6 bg-blue-50 border-blue-100">
            <h3 className="font-bold text-blue-900 mb-2">Pay via UPI</h3>
            <p className="text-sm text-blue-700 mb-4">Please pay <b>{formatCurrency(details.plan_price)}</b> to the UPI ID below and upload the receipt.</p>
            <div className="bg-white p-3 rounded border text-center font-bold text-lg mb-4">
              {adminUpi}
            </div>
            
            <label className="block text-sm font-semibold mb-2">Upload Receipt Screenshot</label>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleFileChange}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100"
            />
            {receiptPreview && (
              <img src={receiptPreview} alt="Receipt Preview" className="mt-4 max-h-32 object-contain mx-auto rounded border" />
            )}
          </Card>
          
          <Button variant="primary" size="lg" fullWidth isLoading={loading} onClick={handlePayment} disabled={!receiptFile}>Submit Payment Details</Button>
        </div>
      </div>
      <div className="flex mt-6"><Button variant="outline" onClick={onBack} leftIcon={<ChevronLeft size={18} />}>Back</Button></div>
    </div>
  )
}

// MAIN COMPONENT
export default function BookSubscription() {
  const [step, setStep] = useState(0)
  const [details, setDetails] = useState({
    pickup_address: '', pickup_lat: '', pickup_lng: '',
    drop_address: '', drop_lat: '', drop_lng: '',
    distance_km: 0, start_date: '', morning_slot: true, evening_slot: true,
    pickup_time: '08:30', return_time: '18:00',
    vehicle_type: 'hatchback', plan_type: '', plan_price: 0, plan_duration: 0
  })

  return (
    <div className="max-w-5xl mx-auto">
      <StepIndicator currentStep={step} />
      <div className="bg-white rounded-2xl shadow-card p-6 md:p-8">
        <AnimatePresence mode="wait">
          <motion.div key={step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.25 }}>
            {step === 0 && <Step1Location details={details} setDetails={setDetails} onNext={() => setStep(1)} />}
            {step === 1 && <Step2Schedule details={details} setDetails={setDetails} onNext={() => setStep(2)} onBack={() => setStep(0)} />}
            {step === 2 && <Step3Packages details={details} setDetails={setDetails} onNext={() => setStep(3)} onBack={() => setStep(1)} />}
            {step === 3 && <Step4Payment details={details} onBack={() => setStep(2)} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
