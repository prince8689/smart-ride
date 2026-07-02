import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Clock, CheckCircle2, Car, Shield, ArrowRight, AlertCircle } from 'lucide-react';
import toast from '../../utils/toastConfig';
import { getProfile } from '../../api/user.api';
import { useNavigate } from 'react-router-dom';
import { createProfile, addVehicle, uploadDocuments } from '../../api/driver.api';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../ui/Spinner';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';


const OnboardingGuard = ({ children }) => {
  const { user, updateUser } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [driverProfile, setDriverProfile] = useState(null);
  const [hasVehicle, setHasVehicle] = useState(false);
  const [currentStep, setCurrentStep] = useState(1); // 1: Profile, 2: Vehicle, 3: Pending
  const [justSubmitted, setJustSubmitted] = useState(false);

  const navigate = useNavigate();
  // Form setups
  const { register: regProf, handleSubmit: handleProfSubmit, formState: { errors: profErr, isSubmitting: isProfSubmitting } } = useForm();
  const { register: regVeh, handleSubmit: handleVehSubmit, formState: { errors: vehErr, isSubmitting: isVehSubmitting } } = useForm();

  useEffect(() => {
    const checkDriverStatus = async () => {
      try {
        const profileRes = await getProfile();
        
        const profile = profileRes.data?.profile || profileRes.data?.driver_profile;
        const vehicles = profileRes.data?.vehicles || [];
        
        setDriverProfile(profile);
        setHasVehicle(vehicles.length > 0);
        
        if (!profile) {
          setCurrentStep(1); // Needs profile
        } else if (vehicles.length === 0) {
          setCurrentStep(2); // Needs vehicle
        } else if (!profile.driver_verified) {
          setCurrentStep(3); // Awaiting verification
        } else {
          setCurrentStep(4); // All good, verified
        }
      } catch (err) {
        toast.error('Failed to load profile details');
      } finally {
        setIsLoading(false);
      }
    };

    checkDriverStatus();
  }, []);

  const onProfileSubmit = async (data) => {
    try {
      let uploadedUrls = {};
      
      if (data.pan_card_image?.[0] || data.license_image?.[0] || data.aadhar_image?.[0]) {
        const formData = new FormData();
        if (data.pan_card_image?.[0]) formData.append('pan_card_image', data.pan_card_image[0]);
        if (data.license_image?.[0]) formData.append('license_image', data.license_image[0]);
        if (data.aadhar_image?.[0]) formData.append('aadhar_image', data.aadhar_image[0]);
        
        const uploadRes = await uploadDocuments(formData);
        if (uploadRes.success) {
          uploadedUrls = uploadRes.data;
        }
      }

      const res = await createProfile({
        license_number: data.license_number.toUpperCase(),
        license_expiry: data.license_expiry,
        aadhar_number: data.aadhar_number,
        pan_card_number: data.pan_card_number?.toUpperCase(),
        bank_account_number: data.bank_account_number,
        experience_years: parseInt(data.experience_years) || 0,
        ...uploadedUrls
      });
      if (res.success) {
        setDriverProfile(res.data);
        updateUser({ ...user, driver_profile: res.data });
        toast.success('Profile created successfully');
        setCurrentStep(2);
      }
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || 'Failed to save profile');
      }
    }
  };

  const onVehicleSubmit = async (data) => {
    try {
      const res = await addVehicle({
        vehicle_number: data.plate_number.toUpperCase(),
        vehicle_type: data.type,
        brand: data.brand,
        model: data.model,
        year: data.year,
        color: data.color,
        seating_capacity: data.seating_capacity
      });
      if (res.success) {
        setHasVehicle(true);
        setJustSubmitted(true);
        toast.success('Your details are submitted for verification. If verified successfully, you will receive subscriptions.');
        setCurrentStep(3);
        setTimeout(() => {
          navigate('/');
        }, 3000);
      }
    } catch (err) {
      if (err.errors && err.errors.length > 0) {
        toast.error(err.errors[0].message);
      } else {
        toast.error(err.message || 'Failed to add vehicle');
      }
    }
  };

  if (isLoading) {
    return <div className="flex h-screen items-center justify-center bg-navy-50"><Spinner size="lg" /></div>;
  }

  // 4 = Fully verified, render dashboard
  if (currentStep === 4 && driverProfile?.driver_verified) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-navy-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xl mb-8 flex justify-center gap-4">
        {[
          { num: 1, label: 'Profile' },
          { num: 2, label: 'Vehicle' },
          { num: 3, label: 'Verification' }
        ].map(step => (
          <div key={step.num} className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm mb-1 ${
              currentStep === step.num ? 'bg-primary-600 text-white' : 
              currentStep > step.num ? 'bg-green-500 text-white' : 
              'bg-navy-200 text-navy-500'
            }`}>
              {currentStep > step.num ? <CheckCircle2 size={16} /> : step.num}
            </div>
            <span className={`text-xs ${currentStep >= step.num ? 'text-navy-900 font-bold' : 'text-navy-400'}`}>
              {step.label}
            </span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-xl">
        {currentStep === 1 && (
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-6 border-b border-navy-100 pb-6">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <Shield size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-navy-900">Driver Verification</h2>
                <p className="text-sm text-navy-500">Provide your documents for background check.</p>
              </div>
            </div>

            <form onSubmit={handleProfSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Driving License Number"
                  placeholder="MH01AB1234"
                  {...regProf('license_number', { required: 'License is required' })}
                  error={profErr.license_number?.message}
                  className="uppercase"
                />
                <Input
                  type="date"
                  label="License Expiry Date"
                  min={new Date().toISOString().split('T')[0]}
                  {...regProf('license_expiry', { required: 'Expiry is required' })}
                  error={profErr.license_expiry?.message}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Aadhar Number"
                  placeholder="1234 5678 9012"
                  {...regProf('aadhar_number', { 
                    required: 'Aadhar is required',
                    pattern: { value: /^\d{12}$/, message: 'Must be 12 digits' }
                  })}
                  error={profErr.aadhar_number?.message}
                />
                <Input
                  label="PAN Card Number"
                  placeholder="ABCDE1234F"
                  {...regProf('pan_card_number', { required: 'PAN is required' })}
                  error={profErr.pan_card_number?.message}
                  className="uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Bank Account Number"
                  placeholder="Account Number"
                  {...regProf('bank_account_number', { required: 'Bank Account is required' })}
                  error={profErr.bank_account_number?.message}
                />
                <Input
                  label="Experience (Years)"
                  type="number"
                  min="0"
                  {...regProf('experience_years')}
                  error={profErr.experience_years?.message}
                />
              </div>

              <div className="space-y-3 pt-2">
                <h3 className="font-bold text-navy-900 text-sm">Upload Documents</h3>
                <Input
                  type="file"
                  label="Driving License Image"
                  accept="image/*"
                  {...regProf('license_image', { required: 'Driving License image is required' })}
                  error={profErr.license_image?.message}
                />
                <Input
                  type="file"
                  label="Aadhar Card Image"
                  accept="image/*"
                  {...regProf('aadhar_image', { required: 'Aadhar image is required' })}
                  error={profErr.aadhar_image?.message}
                />
                <Input
                  type="file"
                  label="PAN Card Image"
                  accept="image/*"
                  {...regProf('pan_card_image', { required: 'PAN Card image is required' })}
                  error={profErr.pan_card_image?.message}
                />
              </div>

              <div className="pt-4">
                <Button type="submit" fullWidth size="lg" rightIcon={<ArrowRight size={18} />} isLoading={isProfSubmitting}>
                  Next Step
                </Button>
              </div>
            </form>
          </Card>
        )}

        {currentStep === 2 && (
          <Card className="p-8">
            <div className="flex items-center gap-4 mb-6 border-b border-navy-100 pb-6">
              <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center">
                <Car size={24} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-navy-900">Vehicle Details</h2>
                <p className="text-sm text-navy-500">Add the vehicle you will use for rides.</p>
              </div>
            </div>

            <form onSubmit={handleVehSubmit(onVehicleSubmit)} className="space-y-4">
              <Input
                label="Vehicle Number Plate"
                placeholder="MH01AB1234"
                {...regVeh('plate_number', { required: 'Plate number is required' })}
                error={vehErr.plate_number?.message}
                className="uppercase"
              />
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-navy-700 block mb-1">Vehicle Type</label>
                  <select 
                    className="w-full border border-navy-200 rounded-xl px-4 py-3 bg-white focus:border-primary-600 outline-none"
                    {...regVeh('type', { required: 'Type required' })}
                  >
                    <option value="">Select...</option>
                    <option value="bike">Bike</option>
                    <option value="scooter">Scooter</option>
                    <option value="auto">Auto Rickshaw</option>
                    <option value="car">Car (Standard)</option>
                    <option value="sedan">Sedan</option>
                    <option value="suv">SUV</option>
                    <option value="hatchback">Hatchback</option>
                    <option value="van">Van</option>
                    <option value="mini_bus">Mini Bus</option>
                    <option value="bus">Bus</option>
                    <option value="truck">Truck / Loader</option>
                  </select>
                  {vehErr.type && <p className="text-red-500 text-xs mt-1">{vehErr.type.message}</p>}
                </div>
                <Input
                  label="Seating Capacity"
                  type="number"
                  min="2" max="50"
                  {...regVeh('seating_capacity', { required: 'Required', min: 2 })}
                  error={vehErr.seating_capacity?.message}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Brand (e.g. Toyota)" {...regVeh('brand', { required: 'Required' })} error={vehErr.brand?.message} />
                <Input label="Model (e.g. Innova)" {...regVeh('model', { required: 'Required' })} error={vehErr.model?.message} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Year" type="number" min="2000" {...regVeh('year', { required: 'Required' })} error={vehErr.year?.message} />
                <Input label="Color" {...regVeh('color', { required: 'Required' })} error={vehErr.color?.message} />
              </div>

              <div className="pt-4 flex gap-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>Back</Button>
                <Button type="submit" fullWidth size="lg" rightIcon={<ArrowRight size={18} />} isLoading={isVehSubmitting}>
                  Submit Details
                </Button>
              </div>
            </form>
          </Card>
        )}

        {currentStep === 3 && (
          <Card className="p-8 text-center flex flex-col items-center">
            {driverProfile?.is_rejected ? (
              <>
                <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mb-6">
                  <AlertCircle size={40} />
                </div>
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Verification Rejected</h2>
                <div className="bg-red-50 text-red-700 p-4 rounded-lg mb-8 max-w-md w-full border border-red-200">
                  <p className="font-semibold mb-1">Reason for Rejection:</p>
                  <p className="text-sm">"{driverProfile.rejection_reason || 'Please update your details.'}"</p>
                </div>
                <Button onClick={() => setCurrentStep(1)} size="lg">
                  Re-submit Documents
                </Button>
              </>
            ) : (
              <>
                <div className="w-20 h-20 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mb-6">
                  <Clock size={40} />
                </div>
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Verifying soon</h2>
                {justSubmitted ? (
                  <>
                    <p className="text-navy-500 mb-8 max-w-md font-medium text-lg">
                      Your account has been sent for verification. If your account verifies successfully then you receive subscriptions.
                    </p>
                    <p className="text-navy-400 mb-8 max-w-md text-sm animate-pulse">
                      Redirecting to homepage...
                    </p>
                  </>
                ) : (
                  <p className="text-navy-500 mb-8 max-w-md font-medium text-lg">
                    Your account is currently under review by our admin team. Please check back later.
                  </p>
                )}
              </>
            )}
          </Card>
        )}
      </div>
    </div>
  );
};

export default OnboardingGuard;
