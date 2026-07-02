const nodemailer = require('nodemailer');
const env = require('../../config/env');
const logger = require('../../utils/logger');

// Let's create a reusable transporter
// The PRD doesn't mention transport details, but usually we'd use environment variables
const transporter = nodemailer.createTransport({
  service: 'gmail', // Assuming gmail for simplicity, PRD says "Gmail needs App Password"
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    if (!env.EMAIL_USER || !env.EMAIL_PASS) {
      logger.warn(`Email not configured. Would have sent email to ${to}: ${subject}`);
      return;
    }
    
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to,
      subject,
      html
    });
    logger.info(`Email sent to ${to}: ${subject}`);
  } catch (error) {
    logger.error('Email send failed:', error);
  }
};

const getBaseTemplate = (title, content) => `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: 'Inter', sans-serif; color: #1f2937; line-height: 1.5; padding: 20px; }
    .header { background: #2563EB; color: white; padding: 20px; text-align: center; font-size: 24px; font-weight: bold; border-radius: 8px 8px 0 0; }
    .content { padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    .otp-box { font-size: 32px; font-weight: bold; letter-spacing: 5px; text-align: center; margin: 20px 0; padding: 15px; background: #f3f4f6; border-radius: 8px; color: #111827; }
    .footer { text-align: center; margin-top: 20px; font-size: 12px; color: #6b7280; }
  </style>
</head>
<body>
  <div class="header">Smart Ride</div>
  <div class="content">
    <h2>${title}</h2>
    ${content}
  </div>
  <div class="footer">
    &copy; ${new Date().getFullYear()} Smart Ride. All rights reserved.
  </div>
</body>
</html>
`;

const sendEmailOTP = async (email, full_name, otp) => {
  const content = `
    <p>Hello ${full_name},</p>
    <p>Please use the following OTP to verify your email address. This OTP expires in 10 minutes.</p>
    <div class="otp-box">${otp}</div>
    <p>If you didn't request this, ignore this email.</p>
  `;
  await sendEmail(email, 'Smart Ride — Verify Your Email', getBaseTemplate('Verify Your Email', content));
};

const sendPhoneOTPLog = (phone, otp) => {
  console.log(`[SMS SIMULATION] OTP ${otp} sent to ${phone}`);
};

const sendWelcomeEmail = async (email, full_name) => {
  const content = `
    <p>Hello ${full_name},</p>
    <p>Welcome to Smart Ride! We are excited to have you on board.</p>
    <p>You can now book daily commute subscriptions at affordable prices.</p>
    <p>Get started by setting up your home and work locations.</p>
  `;
  await sendEmail(email, 'Welcome to Smart Ride!', getBaseTemplate('Welcome to Smart Ride!', content));
};

const sendPasswordResetEmail = async (email, full_name, otp) => {
  const content = `
    <p>Hello ${full_name},</p>
    <p>You requested a password reset. Please use the following OTP to reset your password. This OTP expires in 10 minutes.</p>
    <div class="otp-box">${otp}</div>
    <p>If you didn't request this, ignore this email.</p>
  `;
  await sendEmail(email, 'Smart Ride — Password Reset', getBaseTemplate('Reset Password', content));
};

const sendPasswordChangedEmail = async (email, full_name) => {
  const content = `
    <p>Hello ${full_name},</p>
    <p>Your password has been successfully changed.</p>
    <p>If you did not perform this action, please contact support immediately.</p>
  `;
  await sendEmail(email, 'Smart Ride — Password Changed', getBaseTemplate('Security Alert', content));
};

const sendDriverApprovalEmail = async (email, full_name) => {
  const content = `
    <p>Hello ${full_name},</p>
    <p>Congratulations! Your driver profile has been approved.</p>
    <p>You can now log in to the driver app and start receiving assignments.</p>
  `;
  await sendEmail(email, 'Smart Ride — Driver Profile Approved', getBaseTemplate('Profile Approved', content));
};

const sendDriverRejectionEmail = async (email, full_name, reason) => {
  const content = `
    <p>Hello ${full_name},</p>
    <p>Unfortunately, your driver profile verification was rejected.</p>
    <p><strong>Reason:</strong> ${reason}</p>
    <p>Please log in to the app to update your details and resubmit for verification.</p>
  `;
  await sendEmail(email, 'Smart Ride — Driver Profile Update Required', getBaseTemplate('Action Required', content));
};

module.exports = {
  sendEmailOTP,
  sendPhoneOTPLog,
  sendWelcomeEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendDriverApprovalEmail,
  sendDriverRejectionEmail
};
