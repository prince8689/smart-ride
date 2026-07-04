const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { query } = require('../../config/db');
const logger = require('../../utils/logger');
const emails = require('./auth.emails');
const env = require('../../config/env');

const SALT_ROUNDS = 12;
const JWT_SECRET = env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const JWT_ACCESS_EXPIRES = env.JWT_ACCESS_EXPIRES || '365d';
const JWT_REFRESH_EXPIRES = env.JWT_REFRESH_EXPIRES || '365d';

const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

const registerUser = async (data) => {
  const { full_name, email, phone, password, role } = data;

  try {
    const emailCheck = await query('SELECT id, is_email_verified FROM users WHERE email = $1', [email]);
    if (emailCheck.rows.length > 0) {
      if (emailCheck.rows[0].is_email_verified) {
        throw new Error('EMAIL_EXISTS');
      }
    }

    const phoneCheck = await query('SELECT id, is_phone_verified FROM users WHERE phone = $1', [phone]);
    if (phoneCheck.rows.length > 0) {
      if (phoneCheck.rows[0].is_phone_verified) {
        throw new Error('PHONE_EXISTS');
      }
    }

    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const email_otp = generateOTP();
    const phone_otp = generateOTP();
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);
    const userRole = (role === 'vehicle_owner') ? 'user' : (role || 'user');

    let user_id;
    if (emailCheck.rows.length > 0) {
      user_id = emailCheck.rows[0].id;
      await query(
        `UPDATE users SET full_name=$1, phone=$2, password_hash=$3, role=$4, email_otp=$5, phone_otp=$6, otp_expires_at=$7 WHERE id=$8`,
        [full_name, phone, password_hash, userRole, email_otp, phone_otp, otp_expires_at, user_id]
      );
    } else if (phoneCheck.rows.length > 0) {
      user_id = phoneCheck.rows[0].id;
      await query(
        `UPDATE users SET full_name=$1, email=$2, password_hash=$3, role=$4, email_otp=$5, phone_otp=$6, otp_expires_at=$7 WHERE id=$8`,
        [full_name, email, password_hash, userRole, email_otp, phone_otp, otp_expires_at, user_id]
      );
    } else {
      const result = await query(
        `INSERT INTO users (full_name, email, phone, password_hash, role, email_otp, phone_otp, otp_expires_at, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false) RETURNING id`,
        [full_name, email, phone, password_hash, userRole, email_otp, phone_otp, otp_expires_at]
      );
      user_id = result.rows[0].id;
    }

    await emails.sendEmailOTP(email, full_name, email_otp);
    emails.sendPhoneOTPLog(phone, phone_otp);

    return { user_id, message: 'OTP sent to email and phone' };
  } catch (error) {
    if (['EMAIL_EXISTS', 'PHONE_EXISTS'].includes(error.message)) throw error;
    logger.error('registerUser error:', error);
    throw new Error('DB_ERROR');
  }
};

const verifyEmailOTP = async (email, otp) => {
  try {
    const result = await query('SELECT id, full_name, is_email_verified, email_otp, otp_expires_at FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = result.rows[0];

    if (user.is_email_verified) throw new Error('ALREADY_VERIFIED');
    if (user.email_otp !== otp) throw new Error('INVALID_OTP');
    if (new Date(user.otp_expires_at) < new Date()) throw new Error('OTP_EXPIRED');

    logger.info(`OTP Verified successfully for user: ${email}`);
    await query('UPDATE users SET is_email_verified = true, is_active = true, email_otp = NULL WHERE id = $1', [user.id]);
    await emails.sendWelcomeEmail(email, user.full_name);

    return { verified: true };
  } catch (error) {
    if (['USER_NOT_FOUND', 'ALREADY_VERIFIED', 'INVALID_OTP', 'OTP_EXPIRED'].includes(error.message)) throw error;
    logger.error('verifyEmailOTP error:', error);
    throw new Error('DB_ERROR');
  }
};

const verifyPhoneOTP = async (phone, otp) => {
  try {
    const result = await query('SELECT id, is_phone_verified, phone_otp, otp_expires_at FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = result.rows[0];

    if (user.is_phone_verified) throw new Error('ALREADY_VERIFIED');
    if (user.phone_otp !== otp) throw new Error('INVALID_OTP');
    if (new Date(user.otp_expires_at) < new Date()) throw new Error('OTP_EXPIRED');

    await query('UPDATE users SET is_phone_verified = true, is_active = true, phone_otp = NULL WHERE id = $1', [user.id]);

    return { verified: true };
  } catch (error) {
    if (['USER_NOT_FOUND', 'ALREADY_VERIFIED', 'INVALID_OTP', 'OTP_EXPIRED'].includes(error.message)) throw error;
    logger.error('verifyPhoneOTP error:', error);
    throw new Error('DB_ERROR');
  }
};

const resendEmailOTP = async (email) => {
  try {
    const result = await query('SELECT id, full_name, is_email_verified, otp_expires_at FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = result.rows[0];

    if (user.is_email_verified) throw new Error('ALREADY_VERIFIED');

    // Check last otp sent < 1 min ago (expires_at is +10m, so > 9m left means < 1m ago)
    const now = new Date();
    if (user.otp_expires_at) {
      const msLeft = new Date(user.otp_expires_at).getTime() - now.getTime();
      if (msLeft > 9 * 60 * 1000) throw new Error('OTP_COOLDOWN');
    }

    const email_otp = generateOTP();
    const otp_expires_at = new Date(now.getTime() + 10 * 60 * 1000);

    await query('UPDATE users SET email_otp = $1, otp_expires_at = $2 WHERE id = $3', [email_otp, otp_expires_at, user.id]);
    await emails.sendEmailOTP(email, user.full_name, email_otp);

    return { message: 'OTP resent' };
  } catch (error) {
    if (['USER_NOT_FOUND', 'ALREADY_VERIFIED', 'OTP_COOLDOWN'].includes(error.message)) throw error;
    logger.error('resendEmailOTP error:', error);
    throw new Error('DB_ERROR');
  }
};

const resendPhoneOTP = async (phone) => {
  try {
    const result = await query('SELECT id, phone, is_phone_verified, otp_expires_at FROM users WHERE phone = $1', [phone]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = result.rows[0];

    if (user.is_phone_verified) throw new Error('ALREADY_VERIFIED');

    const now = new Date();
    if (user.otp_expires_at) {
      const msLeft = new Date(user.otp_expires_at).getTime() - now.getTime();
      if (msLeft > 9 * 60 * 1000) throw new Error('OTP_COOLDOWN');
    }

    const phone_otp = generateOTP();
    const otp_expires_at = new Date(now.getTime() + 10 * 60 * 1000);

    await query('UPDATE users SET phone_otp = $1, otp_expires_at = $2 WHERE id = $3', [phone_otp, otp_expires_at, user.id]);
    emails.sendPhoneOTPLog(user.phone, phone_otp);

    return { message: 'OTP resent' };
  } catch (error) {
    if (['USER_NOT_FOUND', 'ALREADY_VERIFIED', 'OTP_COOLDOWN'].includes(error.message)) throw error;
    logger.error('resendPhoneOTP error:', error);
    throw new Error('DB_ERROR');
  }
};

const loginUser = async (email, password) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, phone, role, is_active, is_email_verified, is_phone_verified, password_hash FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) throw new Error('INVALID_CREDENTIALS');
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) throw new Error('INVALID_CREDENTIALS');
    if (!user.is_active) throw new Error('ACCOUNT_DISABLED');
    if (!user.is_email_verified) throw new Error('EMAIL_NOT_VERIFIED');

    const access_token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
    const raw_refresh_token = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
    const hashed_refresh = await bcrypt.hash(raw_refresh_token, 10);

    await query('UPDATE users SET refresh_token = $1, last_active_at = NOW() WHERE id = $2', [hashed_refresh, user.id]);

    const { password_hash, ...sanitizedUser } = user;
    return { access_token, refresh_token: raw_refresh_token, user: sanitizedUser };
  } catch (error) {
    if (['INVALID_CREDENTIALS', 'ACCOUNT_DISABLED', 'EMAIL_NOT_VERIFIED', 'PHONE_NOT_VERIFIED'].includes(error.message)) throw error;
    logger.error('loginUser error:', error);
    throw new Error('DB_ERROR');
  }
};

const refreshAccessToken = async (refresh_token) => {
  try {
    const decoded = jwt.verify(refresh_token, JWT_REFRESH_SECRET);
    const result = await query('SELECT id, email, role, refresh_token FROM users WHERE id = $1', [decoded.id]);
    
    if (result.rows.length === 0) throw new Error('INVALID_REFRESH_TOKEN');
    const user = result.rows[0];
    if (!user.refresh_token) throw new Error('INVALID_REFRESH_TOKEN');

    const isMatch = await bcrypt.compare(refresh_token, user.refresh_token);
    if (!isMatch) throw new Error('INVALID_REFRESH_TOKEN');

    const access_token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
    return { access_token };
  } catch (error) {
    logger.error('refreshAccessToken error:', error);
    throw new Error('INVALID_REFRESH_TOKEN');
  }
};

const forgotPassword = async (email) => {
  try {
    const result = await query('SELECT id, full_name FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    
    const user = result.rows[0];
    const email_otp = generateOTP();
    const otp_expires_at = new Date(Date.now() + 10 * 60 * 1000);

    await query('UPDATE users SET email_otp = $1, otp_expires_at = $2 WHERE id = $3', [email_otp, otp_expires_at, user.id]);
    await emails.sendPasswordResetEmail(email, user.full_name, email_otp);

    return { message: 'Reset OTP sent' };
  } catch (error) {
    if (['USER_NOT_FOUND'].includes(error.message)) throw error;
    logger.error('forgotPassword error:', error);
    throw new Error('DB_ERROR');
  }
};

const resetPassword = async (email, otp, new_password) => {
  try {
    const result = await query('SELECT id, full_name, email_otp, otp_expires_at FROM users WHERE email = $1', [email]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = result.rows[0];

    if (user.email_otp !== otp) throw new Error('INVALID_OTP');
    if (new Date(user.otp_expires_at) < new Date()) throw new Error('OTP_EXPIRED');

    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query(`
      UPDATE users 
      SET password_hash = $1, password_changed_at = NOW(), email_otp = NULL, refresh_token = NULL 
      WHERE id = $2
    `, [password_hash, user.id]);

    await emails.sendPasswordChangedEmail(email, user.full_name);

    return { message: 'Password reset successful' };
  } catch (error) {
    if (['USER_NOT_FOUND', 'INVALID_OTP', 'OTP_EXPIRED'].includes(error.message)) throw error;
    logger.error('resetPassword error:', error);
    throw new Error('DB_ERROR');
  }
};

const changePassword = async (userId, current_password, new_password) => {
  try {
    const result = await query('SELECT id, full_name, email, password_hash FROM users WHERE id = $1', [userId]);
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    const user = result.rows[0];

    const isMatch = await bcrypt.compare(current_password, user.password_hash);
    if (!isMatch) throw new Error('INVALID_CREDENTIALS');

    const password_hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await query(`
      UPDATE users 
      SET password_hash = $1, password_changed_at = NOW(), refresh_token = NULL 
      WHERE id = $2
    `, [password_hash, user.id]);

    await emails.sendPasswordChangedEmail(user.email, user.full_name);

    return { message: 'Password changed' };
  } catch (error) {
    if (['USER_NOT_FOUND', 'INVALID_CREDENTIALS'].includes(error.message)) throw error;
    logger.error('changePassword error:', error);
    throw new Error('DB_ERROR');
  }
};

const getMe = async (userId) => {
  try {
    const result = await query(
      'SELECT id, full_name, email, phone, role, profile_photo, is_active, is_email_verified, is_phone_verified, wallet_balance, created_at FROM users WHERE id = $1',
      [userId]
    );
    if (result.rows.length === 0) throw new Error('USER_NOT_FOUND');
    return result.rows[0];
  } catch (error) {
    logger.error('getMe error:', error);
    throw new Error('DB_ERROR');
  }
};

module.exports = {
  registerUser,
  verifyEmailOTP,
  verifyPhoneOTP,
  resendEmailOTP,
  resendPhoneOTP,
  loginUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  getMe
};
