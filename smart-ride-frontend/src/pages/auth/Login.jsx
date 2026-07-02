import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from '../../utils/toastConfig';
import { useAuth } from '../../hooks/useAuth';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import PageWrapper from '../../components/layout/PageWrapper';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const { register, handleSubmit, formState: { errors }, setError } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      const res = await loginUser(data);
      if (res.success) {
        toast.success('Welcome back!');
        const from = location.state?.from?.pathname || 
          (res.role === 'user' ? '/dashboard' : 
           res.role === 'driver' ? '/driver' : '/admin');
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError('root', { message: err.message || 'Invalid credentials' });
      toast.error(err.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper className="p-0 bg-white lg:bg-navy-50">
      <div className="flex flex-col lg:flex-row w-full min-h-screen">
        {/* Left Panel - Hidden on mobile */}
        <div className="hidden lg:flex w-1/2 bg-navy-900 flex-col justify-between p-12 relative overflow-hidden">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsIDI1NSwgMjU1LCAwLjEpIi8+PC9zdmc+')] opacity-20"></div>
          
          <motion.div
            animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute -top-40 -left-40 w-96 h-96 bg-primary-600 rounded-full mix-blend-multiply filter blur-3xl opacity-20"
          ></motion.div>

          <div className="relative z-10">
            <Link to="/" className="flex items-center gap-3 mb-16">
              <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                SR
              </div>
              <span className="font-bold text-2xl text-white">Smart Ride</span>
            </Link>

            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              Your reliable daily <br/><span className="text-primary-400">commute partner</span>
            </h1>
            
            <div className="space-y-6 text-navy-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-primary-400" />
                <span>Same driver every day</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-primary-400" />
                <span>Fixed pickup & drop</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle2 className="text-primary-400" />
                <span>Predictable pricing</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 text-navy-400 text-sm">
            &copy; {new Date().getFullYear()} Smart Ride. All rights reserved.
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 bg-white">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, staggerChildren: 0.1 }}
            className="w-full max-w-md"
          >
            <div className="text-center lg:text-left mb-8">
              <div className="lg:hidden flex justify-center mb-6">
                <Link to="/" className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                  SR
                </Link>
              </div>
              <h2 className="text-3xl font-bold text-navy-900 mb-2">Welcome back</h2>
              <p className="text-navy-500">Sign in to your account to continue</p>
            </div>

            {errors.root && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
                {errors.root.message}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@example.com"
                leftIcon={<Mail size={20} />}
                error={errors.email?.message}
                {...register('email', { 
                  required: 'Email is required',
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email address' }
                })}
              />

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
                    minLength: { value: 8, message: 'Password must be at least 8 characters' }
                  })}
                />
                <div className="flex justify-end pt-1">
                  <Link to="/forgot-password" className="text-sm font-medium text-primary-600 hover:text-primary-700">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <Button type="submit" fullWidth size="lg" isLoading={isLoading} className="mt-6">
                Sign In
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

            <p className="mt-8 text-center text-navy-600">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-primary-600 hover:text-primary-700 transition-colors">
                Register now
              </Link>
            </p>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default Login;
