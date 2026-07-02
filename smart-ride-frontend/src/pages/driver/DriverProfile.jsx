import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Shield, Car, CheckCircle2, Lock, FileText, Phone, Mail, Eye, EyeOff } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import { getProfile as getUserProfile } from '../../api/user.api';
import { getProfile as getDriverProfile, getMyVehicles, updateProfile as updateDriverProfile } from '../../api/driver.api';
import { changePassword } from '../../api/auth.api';
import { useDriverSocket } from '../../hooks/useDriverSocket';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Avatar from '../../components/ui/Avatar';
import Spinner from '../../components/ui/Spinner';
import Button from '../../components/ui/Button';
import StarRating from '../../components/shared/StarRating';
import PushSetup from '../../components/pwa/PushSetup';
import RouteRegistrationForm from '../../components/driver/RouteRegistrationForm';
import api from '../../api/axios';

const DriverProfile = () => {
  const { user, updateUser } = useAuth();
  const { goOnline, goOffline } = useDriverSocket();
  const [driverProfile, setDriverProfile] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isAvailable, setIsAvailable] = useState(user?.driver_profile?.is_available || false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [ratingsData, setRatingsData] = useState(null);

  // Password change state
  const [pwForm, setPwForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [pwLoading, setPwLoading] = useState(false);
  const [showPw, setShowPw] = useState({ current: false, new: false, confirm: false });
  const [pwErrors, setPwErrors] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      try {
        const profRes = await getDriverProfile();
        
        if (profRes.success) {
          setDriverProfile(profRes.data.profile);
          setIsAvailable(profRes.data.profile.is_available);
          setVehicles(profRes.data.vehicles || []);
          
          try {
            const ratingRes = await api.get(`/ratings/driver/${profRes.data.profile.id}`);
            if (ratingRes.data.success) {
              setRatingsData(ratingRes.data.data);
            }
          } catch {
            // Ratings endpoint may not exist — gracefully ignore
          }
        }
      } catch (err) {
        toast.error('Failed to load profile details');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Availability toggle
  const handleToggleAvailability = async () => {
    setIsUpdatingStatus(true);
    const newStatus = !isAvailable;
    try {
      const res = await updateDriverProfile({ is_available: newStatus });
      if (res.success) {
        setIsAvailable(newStatus);
        if (user) {
          updateUser({
            ...user,
            driver_profile: {
              ...user.driver_profile,
              is_available: newStatus
            }
          });
        }
        if (newStatus) {
          goOnline();
          toast.success('You are now Online and available for rides');
        } else {
          goOffline();
          toast.info('You are now Offline');
        }
      }
    } catch (err) {
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Change password
  async function handleChangePassword() {
    const errs = {};
    if (!pwForm.current_password) errs.current = 'Current password is required';
    if (!pwForm.new_password || pwForm.new_password.length < 8) errs.new = 'Min 8 characters required';
    if (pwForm.new_password !== pwForm.confirm_password) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length > 0) { setPwErrors(errs); return; }

    setPwLoading(true);
    try {
      await changePassword({
        current_password: pwForm.current_password,
        new_password: pwForm.new_password
      });
      setPwForm({ current_password: '', new_password: '', confirm_password: '' });
      setPwErrors({});
      toast.success('Password changed successfully');
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to change password');
    } finally {
      setPwLoading(false);
    }
  }

  const maskString = (str, visibleLen = 4) => {
    if (!str) return '';
    return str.substring(0, 4) + '*'.repeat(Math.max(0, str.length - 8)) + str.substring(str.length - visibleLen);
  };

  if (isLoading) return <div className="flex h-[60vh] justify-center items-center"><Spinner size="lg" /></div>;

  return (
    <div className="max-w-4xl mx-auto pt-4 pb-12 space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold text-navy-900 mb-8">Driver Profile</h1>

      {/* Main Profile Header */}
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-24 bg-gradient-to-r from-navy-800 to-navy-900"></div>
        <div className="relative pt-12 px-4 md:px-8 pb-4 flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
          <Avatar name={user?.full_name} src={user?.profile_photo} size="xl" className="border-4 border-white shadow-lg w-24 h-24 text-2xl" />

          <div className="flex-1 mt-2">
            <div className="flex flex-col md:flex-row md:items-center gap-3 mb-2">
              <h2 className="text-2xl font-bold text-navy-900">{user?.full_name}</h2>
              {driverProfile?.is_verified && (
                <Badge color="green" className="mx-auto md:mx-0"><Shield size={12} className="mr-1 inline" /> Verified Driver</Badge>
              )}
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-navy-600 mb-6">
              <span className="flex items-center gap-1.5"><Phone size={14} className="text-navy-400" /> {user?.phone}</span>
              <span className="flex items-center gap-1.5"><Mail size={14} className="text-navy-400" /> {user?.email}</span>
              <span className="flex items-center gap-1.5 font-bold text-yellow-600">
                ⭐ {ratingsData?.average || driverProfile?.rating || 'No ratings yet'}
                {ratingsData?.total_count > 0 && <span className="text-navy-400 text-xs font-normal">({ratingsData.total_count} reviews)</span>}
              </span>
            </div>

            {/* Availability Toggle */}
            <div className="bg-navy-50 p-4 rounded-2xl flex items-center justify-between border border-navy-100">
              <div>
                <h3 className="font-bold text-navy-900">Current Status</h3>
                <p className="text-xs text-navy-500">
                  {isAvailable ? 'You are available for new ride assignments' : 'Toggle to receive ride assignments and share location.'}
                </p>
              </div>
              <button
                onClick={handleToggleAvailability}
                disabled={isUpdatingStatus}
                className={`flex items-center gap-2 px-6 py-2 rounded-xl font-bold transition-all ${
                  isAvailable ? 'bg-green-100 text-green-700 border-2 border-green-200' : 'bg-navy-200 text-navy-700 border-2 border-navy-300'
                }`}
              >
                <div className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-green-500 animate-pulse' : 'bg-navy-500'}`}></div>
                {isAvailable ? 'ONLINE' : 'OFFLINE'}
              </button>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Document Details */}
        <Card className="flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-navy-900 flex items-center gap-2">
              <FileText size={20} className="text-primary-600" /> Document Details
            </h3>
          </div>

          <div className="space-y-4 flex-1">
            <div className="bg-navy-50 p-3 rounded-xl">
              <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Driving License</p>
              <div className="flex justify-between items-center">
                <p className="text-navy-900 font-bold font-mono tracking-wider">{maskString(driverProfile?.license_number, 4)}</p>
                <Badge color="green" size="sm">Verified</Badge>
              </div>
              <p className="text-xs text-navy-500 mt-2">Expires: {driverProfile?.license_expiry}</p>
              {driverProfile?.license_image && (
                <a href={driverProfile.license_image} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">View Image</a>
              )}
            </div>

            <div className="bg-navy-50 p-3 rounded-xl">
              <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Aadhar Number</p>
              <div className="flex justify-between items-center">
                <p className="text-navy-900 font-bold font-mono tracking-wider">XXXX-XXXX-{driverProfile?.aadhar_number?.slice(-4)}</p>
                <Badge color="green" size="sm">Verified</Badge>
              </div>
              {driverProfile?.aadhar_image && (
                <a href={driverProfile.aadhar_image} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">View Image</a>
              )}
            </div>

            <div className="bg-navy-50 p-3 rounded-xl">
              <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">PAN Card</p>
              <div className="flex justify-between items-center">
                <p className="text-navy-900 font-bold font-mono tracking-wider">{maskString(driverProfile?.pan_card_number, 2)}</p>
                <Badge color="green" size="sm">Verified</Badge>
              </div>
              {driverProfile?.pan_card_image && (
                <a href={driverProfile.pan_card_image} target="_blank" rel="noreferrer" className="text-xs text-primary-600 hover:underline mt-2 inline-block">View Image</a>
              )}
            </div>

            <div className="bg-navy-50 p-3 rounded-xl grid grid-cols-2 gap-2">
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Bank Account</p>
                <p className="text-navy-900 font-bold font-mono">{maskString(driverProfile?.bank_account_number, 4)}</p>
              </div>
              <div>
                <p className="text-xs font-bold text-navy-400 uppercase tracking-wider mb-1">Experience</p>
                <p className="text-navy-900 font-bold">{driverProfile?.experience_years} Years</p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-navy-100 text-xs text-navy-500 text-center">
            To update your verified documents, please contact admin support.
          </div>
        </Card>

        {/* Vehicle Details */}
        <Card className="flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-lg text-navy-900 flex items-center gap-2">
              <Car size={20} className="text-primary-600" /> My Vehicles
            </h3>
            <Button variant="ghost" size="sm">Add New</Button>
          </div>

          <div className="space-y-4 flex-1">
            {vehicles.length > 0 ? vehicles.map(v => (
              <div key={v.id} className="border-2 border-primary-100 bg-primary-50/30 p-4 rounded-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">PRIMARY</div>

                <div className="flex justify-between items-start mb-2">
                  <h4 className="font-bold text-navy-900 text-lg">{v.brand} {v.model}</h4>
                </div>

                <div className="flex items-center gap-2 mb-4">
                  <span className="bg-white border border-navy-200 px-3 py-1 rounded-md text-sm font-bold font-mono text-navy-900 tracking-widest shadow-sm">
                    {v.plate_number || v.vehicle_number}
                  </span>
                  <Badge color="blue">{v.type || v.vehicle_type}</Badge>
                </div>

                <div className="flex gap-4 text-xs text-navy-600">
                  <span>Color: <span className="font-medium text-navy-900">{v.color}</span></span>
                  <span>Year: <span className="font-medium text-navy-900">{v.year}</span></span>
                  <span>Seats: <span className="font-medium text-navy-900">{v.seating_capacity}</span></span>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-navy-500">No vehicles registered yet.</div>
            )}
          </div>
        </Card>
      </div>

      {/* Route Registration Section */}
      <Card className="flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-navy-900 flex items-center gap-2">
            📍 Operating Route
          </h3>
        </div>
        <div className="bg-navy-50 rounded-xl p-4 md:p-6 border border-navy-100">
          <RouteRegistrationForm onSuccess={(data) => {
            toast.success("Your operating route has been successfully saved!");
            // Optionally, refresh profile or routes here
          }} />
        </div>
      </Card>

      {/* Ratings Section */}
      <Card className="flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-navy-900 flex items-center gap-2">
            ⭐ Passenger Reviews
          </h3>
        </div>

        {ratingsData && ratingsData.total_count > 0 ? (
          <div className="flex flex-col md:flex-row gap-8">
            <div className="md:w-1/3 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-navy-100 pb-6 md:pb-0">
              <h4 className="text-5xl font-bold text-navy-900 mb-2">{ratingsData.average}</h4>
              <StarRating rating={ratingsData.average} size="lg" />
              <p className="text-sm text-navy-500 mt-2">Based on {ratingsData.total_count} reviews</p>
            </div>
            <div className="md:w-2/3 space-y-2">
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingsData.distribution[star] || 0;
                const percentage = ratingsData.total_count ? (count / ratingsData.total_count) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-navy-700 w-8">{star} ★</span>
                    <div className="flex-1 h-3 bg-navy-100 rounded-full overflow-hidden">
                      <div className="h-full bg-yellow-400 rounded-full transition-all" style={{ width: `${percentage}%` }}></div>
                    </div>
                    <span className="text-xs text-navy-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-navy-500">No ratings yet. Keep providing great service!</div>
        )}

        {ratingsData?.ratings?.length > 0 && (
          <div className="mt-8 space-y-4">
            <h4 className="font-bold text-navy-900">Recent Reviews</h4>
            {ratingsData.ratings.slice(0, 5).map(rating => (
              <div key={rating.id} className="bg-navy-50 p-4 rounded-xl">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <Avatar name={rating.masked_name} src={rating.profile_photo} size="sm" />
                    <span className="font-bold text-navy-900">{rating.masked_name}</span>
                  </div>
                  <span className="text-xs text-navy-500">{new Date(rating.created_at).toLocaleDateString()}</span>
                </div>
                <StarRating rating={rating.rating} size="sm" />
                {rating.review && <p className="text-sm text-navy-700 mt-2 italic">"{rating.review}"</p>}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Change Password */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
        <Card className="p-6">
          <h3 className="font-bold text-lg text-navy-900 mb-6 flex items-center gap-2">
            <Lock size={20} className="text-primary-600" /> Change Password
          </h3>
          <div className="space-y-4 max-w-md">
            {[
              { key: 'current_password', label: 'Current Password', pwKey: 'current' },
              { key: 'new_password', label: 'New Password', pwKey: 'new' },
              { key: 'confirm_password', label: 'Confirm New Password', pwKey: 'confirm' },
            ].map(field => (
              <div key={field.key}>
                <label className="block text-sm font-bold text-navy-700 mb-1.5">{field.label}</label>
                <div className="relative">
                  <input
                    type={showPw[field.pwKey] ? 'text' : 'password'}
                    value={pwForm[field.key]}
                    onChange={e => {
                      setPwForm(f => ({ ...f, [field.key]: e.target.value }));
                      setPwErrors(prev => ({ ...prev, [field.pwKey]: '' }));
                    }}
                    className={`w-full border rounded-xl px-4 py-3 pr-11 text-sm focus:outline-none focus:ring-2 transition-colors ${
                      pwErrors[field.pwKey]
                        ? 'border-red-400 focus:ring-red-100'
                        : 'border-navy-200 focus:border-primary-600 focus:ring-primary-100'
                    }`}
                    placeholder={field.label}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(s => ({ ...s, [field.pwKey]: !s[field.pwKey] }))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-navy-400 hover:text-navy-600 transition-colors"
                  >
                    {showPw[field.pwKey] ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {pwErrors[field.pwKey] && (
                  <p className="text-red-500 text-xs mt-1 font-medium">{pwErrors[field.pwKey]}</p>
                )}
              </div>
            ))}

            <Button variant="primary" isLoading={pwLoading} onClick={handleChangePassword}>
              Update Password
            </Button>
          </div>
        </Card>
      </motion.div>

      {/* Push notification setup */}
      <div className="mt-6">
        <PushSetup />
      </div>
    </div>
  );
};

export default DriverProfile;
