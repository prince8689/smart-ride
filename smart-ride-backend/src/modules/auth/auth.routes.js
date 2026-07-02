const express = require('express');
const router = express.Router();

const authController = require('./auth.controller');
const { verifyToken } = require('../../middleware/auth');
const { 
  registerValidator, 
  verifyEmailOTPValidator, 
  verifyPhoneOTPValidator, 
  loginValidator, 
  forgotPasswordValidator, 
  resetPasswordValidator, 
  changePasswordValidator 
} = require('./auth.validators');

// Public
router.post('/register', registerValidator, authController.register);
router.post('/verify-email-otp', verifyEmailOTPValidator, authController.verifyEmailOTP);
router.post('/verify-phone-otp', verifyPhoneOTPValidator, authController.verifyPhoneOTP);
router.post('/resend-email-otp', authController.resendEmailOTP);
router.post('/resend-phone-otp', authController.resendPhoneOTP);
router.post('/login', loginValidator, authController.login);
router.post('/refresh', authController.refreshToken);
router.post('/forgot-password', forgotPasswordValidator, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, authController.resetPassword);

// Protected
router.post('/logout', verifyToken, authController.logout);
router.post('/change-password', verifyToken, changePasswordValidator, authController.changePassword);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
