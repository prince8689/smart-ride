import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { User, Mail, Lock, Phone, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import PageWrapper from '../../components/layout/PageWrapper';

const Register = () => {
  const [role, setRole] = useState('user');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [termsModal, setTermsModal] = useState({ isOpen: false, type: 'terms' });
  const { registerUser, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  const { register, handleSubmit, watch, formState: { errors }, setError, setValue } = useForm();
  const passwordVal = watch('password', '');

  const getPasswordStrength = (pass) => {
    let score = 0;
    if (!pass) return score;
    if (pass.length > 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;
    return score;
  };

  const passScore = getPasswordStrength(passwordVal);
  const strengthColors = ['bg-gray-200', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const payload = { ...data, role };
      if (payload.phone) payload.phone = payload.phone.replace(/\D/g, '');
      delete payload.confirmPassword;
      const res = await registerUser(payload);
      if (res.success) {
        toast.success('Registration successful. OTP sent to your email.');
        navigate('/verify-otp');
      }
    } catch (err) {
      setError('root', { message: err.message || 'Registration failed' });
      toast.error(err.message || 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  const onGoogleSuccess = async (credentialResponse) => {
    setIsLoading(true);
    try {
      // Pass the selected role ('user' or 'driver') so backend can create proper account if new
      const res = await loginWithGoogle(credentialResponse.credential, role);
      if (res.success) {
        toast.success('Google login successful!');
        const from = (res.role === 'user' ? '/dashboard' : 
                      res.role === 'driver' ? '/driver' : '/admin');
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('root', { message: err.message || 'Google Login failed' });
      toast.error(err.message || 'Google Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="p-0 bg-white lg:bg-navy-50">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        {/* Left Panel */}
        <div className="hidden lg:flex w-5/12 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+PC9zdmc+')] opacity-20"></div>
          
          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                SR
              </div>
              <span className="font-bold text-2xl text-white">Smart Ride</span>
            </Link>

            <h1 className="text-4xl font-bold text-white mb-8">
              Join <span className="text-primary-400">Smart Ride</span>
            </h1>
            
            <div className="space-y-8">
              {[
                { num: '1', title: 'Register Account', desc: 'Sign up as a commuter or driver' },
                { num: '2', title: 'Verify Email', desc: 'Enter the OTP sent to your inbox' },
                { num: '3', title: 'Subscribe', desc: 'Choose your route and monthly plan' },
                { num: '4', title: 'Ride Daily', desc: 'Enjoy hassle-free daily commutes' },
              ].map((step, idx) => (
                <div key={idx} className="flex gap-4">
                  <div className="w-8 h-8 rounded-full bg-navy-800 border border-navy-700 flex items-center justify-center text-primary-400 font-bold shrink-0">
                    {step.num}
                  </div>
                  <div>
                    <h3 className="text-white font-medium">{step.title}</h3>
                    <p className="text-navy-300 text-sm">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="w-full lg:w-7/12 flex items-center justify-center p-6 sm:p-12 bg-white">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-xl"
          >
            <div className="text-center lg:text-left mb-8">
              <div className="lg:hidden flex justify-center mb-6">
                <Link to="/" className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  SR
                </Link>
              </div>
              <h2 className="text-3xl font-bold text-navy-900 mb-2">Create your account</h2>
              <p className="text-navy-500">Join thousands of daily commuters</p>
            </div>

            <div className="flex p-1 bg-navy-50 rounded-xl mb-8">
              <button
                type="button"
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  role === 'user' ? 'bg-primary-600 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900'
                }`}
                onClick={() => setRole('user')}
              >
                🚗 I'm a Commuter
              </button>
              <button
                type="button"
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  role === 'driver' ? 'bg-primary-600 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900'
                }`}
                onClick={() => setRole('driver')}
              >
                🚕 I'm a Driver
              </button>
            </div>

            {errors.root && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {errors.root.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <Input
                  label="Full Name"
                  placeholder="John Doe"
                  leftIcon={<User size={20} />}
                  error={errors.full_name?.message}
                  {...register('full_name', { required: 'Name is required' })}
                />
                <Input
                  label="Phone Number"
                  placeholder="9876543210"
                  type="tel"
                  leftIcon={<Phone size={20} />}
                  error={errors.phone?.message}
                  {...register('phone', { 
                    required: 'Phone is required',
                    pattern: { value: /^[\d\s\-\+]{10,15}$/, message: 'Invalid phone format' }
                  })}
                />
              </div>

              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail size={20} />}
                error={errors.email?.message}
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' }
                })}
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-1">
                  <Input
                    label="Password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    leftIcon={<Lock size={20} />}
                    rightIcon={showPassword ? <EyeOff size={20} onClick={() => setShowPassword(false)} /> : <Eye size={20} onClick={() => setShowPassword(true)} />}
                    error={errors.password?.message}
                    {...register('password', { 
                      required: 'Password is required',
                      minLength: { value: 8, message: 'Min 8 characters' },
                      pattern: {
                        value: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
                        message: 'Must contain uppercase, lowercase & number'
                      }
                    })}
                  />
                  {passwordVal?.length > 0 && (
                    <div className="flex gap-1 mt-2">
                      {[1, 2, 3, 4].map(i => (
                        <div key={i} className={`h-1.5 w-1/4 rounded-full ${i <= passScore ? strengthColors[passScore] : 'bg-gray-200'}`} />
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  label="Confirm Password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  leftIcon={<Lock size={20} />}
                  error={errors.confirmPassword?.message}
                  {...register('confirmPassword', { 
                    required: 'Please confirm password',
                    validate: val => val === passwordVal || 'Passwords do not match'
                  })}
                />
              </div>

              <div className="flex items-start gap-3 py-2">
                <input
                  type="checkbox"
                  id="terms"
                  className="mt-1 w-4 h-4 text-primary-600 rounded border-navy-300 focus:ring-primary-600"
                  {...register('terms', { required: 'You must agree to the terms' })}
                />
                <label htmlFor="terms" className="text-sm text-navy-600">
                  I agree to the <button type="button" onClick={() => setTermsModal({ isOpen: true, type: 'terms' })} className="text-primary-600 hover:underline">{role === 'driver' ? 'Driver Terms' : 'Commuter Terms'}</button> and <button type="button" onClick={() => setTermsModal({ isOpen: true, type: 'privacy' })} className="text-primary-600 hover:underline">Privacy Policy</button>
                </label>
              </div>
              {errors.terms && <p className="text-red-500 text-xs">{errors.terms.message}</p>}

              <Button type="submit" fullWidth size="lg" isLoading={isLoading} rightIcon={<ArrowRight size={18} />}>
                Create Account
              </Button>
            </form>

            <div className="mt-8 relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-navy-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-navy-500">OR</span>
              </div>
            </div>

            <div className="mt-6 flex justify-center">
              <GoogleLogin
                onSuccess={onGoogleSuccess}
                onError={() => {
                  toast.error('Google Login Failed');
                }}
                useOneTap
              />
            </div>

            <p className="mt-8 text-center text-navy-600">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Sign in
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

      <Modal
        isOpen={termsModal.isOpen}
        onClose={() => setTermsModal({ isOpen: false, type: 'terms' })}
        title={termsModal.type === 'terms' ? (role === 'driver' ? 'Driver Terms' : 'Commuter Terms') : 'Privacy Policy'}
        size="lg"
      >
        <div className="space-y-4 text-sm text-navy-700">
          {termsModal.type === 'terms' ? (
            <>
              <p>Welcome to Smart Ride. By registering, you agree to abide by our terms of service.</p>
              <h4 className="font-bold text-navy-900 mt-4">1. Account Responsibilities</h4>
              <p>You are responsible for maintaining the confidentiality of your account credentials. Any activity under your account is your responsibility.</p>
              
              <h4 className="font-bold text-navy-900 mt-4">2. Service Usage</h4>
              <p>Smart Ride provides a platform connecting commuters and drivers. We expect all users to maintain a respectful and safe environment. {role === 'driver' ? 'As a driver, you must ensure your vehicle meets all safety standards and you hold a valid driving license.' : 'As a commuter, please be punctual at pickup points and respect the driver and co-passengers.'}</p>

              <h4 className="font-bold text-navy-900 mt-4">3. Payments & Cancellations</h4>
              <p>Subscriptions are billed according to your selected plan. Cancellations are subject to our refund policy. Please refer to the detailed payment terms in the help section.</p>
              
              <h4 className="font-bold text-navy-900 mt-4">4. Liability</h4>
              <p>Smart Ride is not liable for indirect damages or losses arising from your use of the service. We strive for maximum reliability but do not guarantee uninterrupted availability.</p>
            </>
          ) : (
            <>
              <p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information.</p>
              
              <h4 className="font-bold text-navy-900 mt-4">Information Collection</h4>
              <p>We collect information you provide directly (like name, phone, email) and data about your usage of our app, including location data when necessary for providing the service.</p>

              <h4 className="font-bold text-navy-900 mt-4">Data Usage</h4>
              <p>We use your data to operate the service, process transactions, send notifications, and improve user experience. Your location data is used to coordinate rides between commuters and drivers.</p>

              <h4 className="font-bold text-navy-900 mt-4">Data Sharing</h4>
              <p>We do not sell your personal data. We may share necessary information (like name and masked phone number) between matched drivers and commuters solely for the purpose of the ride.</p>
              
              <h4 className="font-bold text-navy-900 mt-4">Security</h4>
              <p>We employ industry-standard security measures to protect your data against unauthorized access.</p>
            </>
          )}
          
          <div className="pt-6 pb-2">
            <Button fullWidth onClick={() => {
              setTermsModal({ isOpen: false, type: 'terms' });
              setValue('terms', true);
              setError('terms', { type: 'manual', message: '' });
            }}>
              I Agree & Continue
            </Button>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default Register;
