import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import Button from '../ui/Button';

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        isScrolled ? 'bg-white/95 backdrop-blur-md shadow-sm py-3' : 'bg-transparent py-5'
      }`}
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
              SR
            </div>
            <span className={`font-bold text-xl ${isScrolled ? 'text-navy-900' : 'text-white md:text-white text-navy-900'}`}>
              Smart Ride
            </span>
          </Link>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <Button 
              variant="ghost" 
              className={isScrolled ? 'text-navy-600' : 'text-white hover:text-white hover:bg-white/10'}
              onClick={() => navigate('/login')}
            >
              Sign In
            </Button>
            <Button 
              variant="primary"
              onClick={() => navigate('/register')}
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden p-2 text-navy-900"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} color={isScrolled ? '#0F172A' : '#ffffff'} />
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ type: 'tween', duration: 0.3 }}
            className="fixed inset-0 z-50 bg-white p-6 flex flex-col"
          >
            <div className="flex justify-between items-center mb-8">
              <Link to="/" className="flex items-center gap-3" onClick={() => setIsMobileMenuOpen(false)}>
                <div className="w-10 h-10 bg-primary-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  SR
                </div>
                <span className="font-bold text-xl text-navy-900">Smart Ride</span>
              </Link>
              <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-navy-400 hover:bg-navy-50 rounded-full">
                <X size={24} />
              </button>
            </div>

            <div className="flex flex-col gap-4 mt-8">
              <Button 
                variant="outline" 
                size="lg" 
                fullWidth
                onClick={() => { setIsMobileMenuOpen(false); navigate('/login'); }}
              >
                Sign In
              </Button>
              <Button 
                variant="primary" 
                size="lg" 
                fullWidth
                onClick={() => { setIsMobileMenuOpen(false); navigate('/register'); }}
              >
                Get Started
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

export default Navbar;
