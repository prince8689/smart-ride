import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from '../../utils/toastConfig';
import { resetPassword } from '../../api/auth.api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageWrapper from '../../components/layout/PageWrapper';

const ResetPassword = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const queryEmail = new URLSearchParams(location.search).get('email');
  const sessionEmail = sessionStorage.getItem('sr_reset_email');
  const email = queryEmail || sessionEmail;
  
  const inputRefs = useRef([]);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const passwordVal = watch('newPassword', '');

  useEffect(() => {
    if (!email) navigate('/forgot-password');
  }, [email, navigate]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value !== '' && index < 5) inputRefs.current[index + 1].focus();
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text/plain').slice(0, 6).split('');
    if (pastedData.length > 0) {
      const newOtp = [...otp];
      pastedData.forEach((char, index) => {
        if (!isNaN(char) && index < 6) newOtp[index] = char;
      });
      setOtp(newOtp);
      const nextIndex = Math.min(pastedData.length, 5);
      inputRefs.current[nextIndex].focus();
    }
  };

  const onSubmit = async (data) => {
    const otpString = otp.join('');
    if (otpString.length !== 6) return toast.error('Enter 6-digit OTP');

    setIsLoading(true);
    try {
      const res = await resetPassword({ email, otp: otpString, new_password: data.newPassword });
      if (res.success) {
        setIsSuccess(true);
        sessionStorage.removeItem('sr_reset_email');
        setTimeout(() => navigate('/login'), 2500);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <PageWrapper className="flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md bg-white rounded-2xl shadow-card p-10 text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-2xl font-bold text-navy-900 mb-2">Password Reset!</h2>
          <p className="text-navy-500">Your password has been changed successfully. Redirecting to login...</p>
        </motion.div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper className="flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md bg-white rounded-2xl shadow-card p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-2">Reset Password</h2>
        <p className="text-navy-500 mb-6 text-sm">Enter the code sent to {email} and your new password.</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="text-sm font-medium text-navy-700 mb-2 block">OTP Code</label>
            <div className="flex justify-between gap-2">
              {otp.map((digit, idx) => (
                <input
                  key={idx}
                  ref={el => inputRefs.current[idx] = el}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  onPaste={handlePaste}
                  className={`w-10 h-12 sm:w-12 sm:h-14 text-center text-lg font-bold rounded-xl border-2 transition-all outline-none
                    ${digit ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-navy-200 bg-white text-navy-900'}
                    focus:border-primary-600 focus:ring-4 focus:ring-primary-100`}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <Input
              label="New Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              leftIcon={<Lock size={20} />}
              rightIcon={showPassword ? <EyeOff size={20} onClick={() => setShowPassword(false)} /> : <Eye size={20} onClick={() => setShowPassword(true)} />}
              error={errors.newPassword?.message}
              {...register('newPassword', { 
                required: 'Password is required',
                minLength: { value: 8, message: 'Min 8 characters' }
              })}
            />

            <Input
              label="Confirm New Password"
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

          <Button type="submit" fullWidth size="lg" isLoading={isLoading} disabled={otp.join('').length !== 6}>
            Reset Password
          </Button>
        </form>
      </motion.div>
    </PageWrapper>
  );
};

export default ResetPassword;
