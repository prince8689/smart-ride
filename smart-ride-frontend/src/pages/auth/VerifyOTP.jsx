import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import { resendOTP } from '../../api/auth.api';
import Button from '../../components/ui/Button';
import PageWrapper from '../../components/layout/PageWrapper';

const VerifyOTP = () => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [timer, setTimer] = useState(60);
  const [shake, setShake] = useState(false);
  
  const { verifyOTPUser } = useAuth();
  const navigate = useNavigate();
  const [email] = useState(() => sessionStorage.getItem('sr_pending_email'));
  
  const inputRefs = useRef([]);

  useEffect(() => {
    if (!email) {
      navigate('/register');
    }
  }, [email, navigate]);

  useEffect(() => {
    if (timer > 0) {
      const id = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(id);
    }
  }, [timer]);

  const handleChange = (index, value) => {
    if (isNaN(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    if (value !== '' && index < 5) {
      inputRefs.current[index + 1].focus();
    }
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

  const handleResend = async () => {
    if (timer > 0) return;
    try {
      await resendOTP({ email });
      setTimer(60);
      toast.success('New OTP sent to your email');
    } catch (err) {
      toast.error(err.message || 'Failed to resend OTP');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) return;

    setIsLoading(true);
    try {
      const res = await verifyOTPUser({ email, otp: otpString });
      if (res.success) {
        sessionStorage.removeItem('sr_pending_email');
        toast.success('Email verified successfully! Please login.');
        navigate('/login', { replace: true });
      }
    } catch (err) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      toast.error(err.message || 'Invalid OTP');
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0].focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-card p-8 text-center"
      >
        <div className="w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <div className="w-8 h-8 bg-primary-600 rounded-full text-white font-bold flex items-center justify-center">
            SR
          </div>
        </div>

        <h2 className="text-2xl font-bold text-navy-900 mb-2">Verify Your Email</h2>
        <p className="text-navy-500 mb-8">
          We sent a 6-digit code to <span className="font-semibold text-navy-900">{email}</span>
        </p>

        <form onSubmit={handleSubmit}>
          <motion.div 
            className="flex justify-center gap-2 sm:gap-3 mb-8"
            animate={shake ? { x: [-10, 10, -10, 10, 0] } : {}}
            transition={{ duration: 0.4 }}
          >
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
                className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 transition-all outline-none
                  ${digit ? 'border-primary-600 bg-primary-50 text-primary-700' : 'border-navy-200 bg-white text-navy-900'}
                  focus:border-primary-600 focus:ring-4 focus:ring-primary-100`}
              />
            ))}
          </motion.div>

          <Button 
            type="submit" 
            fullWidth 
            size="lg" 
            disabled={otp.join('').length !== 6}
            isLoading={isLoading}
          >
            Verify Email
          </Button>
        </form>

        <div className="mt-8 text-sm">
          {timer > 0 ? (
            <p className="text-navy-500">
              Resend code in <span className="font-semibold text-primary-600">0:{timer.toString().padStart(2, '0')}</span>
            </p>
          ) : (
            <p className="text-navy-500">
              Didn't receive the code?{' '}
              <button 
                onClick={handleResend}
                className="font-semibold text-primary-600 hover:text-primary-700 hover:underline"
              >
                Resend OTP
              </button>
            </p>
          )}
        </div>
      </motion.div>
    </PageWrapper>
  );
};

export default VerifyOTP;
