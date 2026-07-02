import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import toast from '../../utils/toastConfig';
import { forgotPassword } from '../../api/auth.api';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageWrapper from '../../components/layout/PageWrapper';

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await forgotPassword(data);
      if (res.success) {
        setIsSuccess(true);
        sessionStorage.setItem('sr_reset_email', data.email);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to send reset link');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-card p-8"
      >
        <Link to="/login" className="inline-flex items-center text-sm font-medium text-navy-500 hover:text-navy-900 mb-6 transition-colors">
          <ArrowLeft size={16} className="mr-1" /> Back to login
        </Link>

        {isSuccess ? (
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center py-6">
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <h2 className="text-2xl font-bold text-navy-900 mb-2">Check your email</h2>
            <p className="text-navy-500 mb-8">
              We've sent password reset instructions to your email address.
            </p>
            <Link to="/reset-password">
              <Button fullWidth>Enter Reset Code</Button>
            </Link>
          </motion.div>
        ) : (
          <>
            <div className="w-12 h-12 bg-primary-100 text-primary-600 rounded-full flex items-center justify-center mb-6">
              <KeyRound size={24} />
            </div>
            
            <h2 className="text-2xl font-bold text-navy-900 mb-2">Forgot Password?</h2>
            <p className="text-navy-500 mb-8">
              Enter the email address associated with your account and we'll send you a link to reset your password.
            </p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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

              <Button type="submit" fullWidth size="lg" isLoading={isLoading}>
                Send Reset Code
              </Button>
            </form>
          </>
        )}
      </motion.div>
    </PageWrapper>
  );
};

export default ForgotPassword;
