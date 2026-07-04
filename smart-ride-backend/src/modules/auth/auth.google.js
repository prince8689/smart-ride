const { OAuth2Client } = require('google-auth-library');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../../config/db');
const env = require('../../config/env');
const logger = require('../../utils/logger');

const client = new OAuth2Client(env.GOOGLE_CLIENT_ID);
const JWT_SECRET = env.JWT_SECRET || 'fallback_secret';
const JWT_REFRESH_SECRET = env.JWT_REFRESH_SECRET || 'fallback_refresh_secret';
const JWT_ACCESS_EXPIRES = env.JWT_ACCESS_EXPIRES || '365d';
const JWT_REFRESH_EXPIRES = env.JWT_REFRESH_EXPIRES || '365d';

const verifyGoogleToken = async (credential) => {
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: env.GOOGLE_CLIENT_ID,
  });
  return ticket.getPayload();
};

const googleLogin = async (req, res, next) => {
  try {
    const { credential, role } = req.body;
    if (!credential) {
      return res.status(400).json({ success: false, message: 'Google credential missing' });
    }

    const payload = await verifyGoogleToken(credential);
    const { email, name, picture } = payload;

    // Check if user exists
    let result = await query(
      'SELECT id, full_name, email, phone, role, is_active, is_email_verified, is_phone_verified, password_hash FROM users WHERE email = $1',
      [email]
    );

    let user;

    if (result.rows.length === 0) {
      // User doesn't exist, create them
      const userRole = (role === 'driver' || role === 'user') ? role : 'user';
      // Generate a random password since they use Google
      const randomPassword = Math.random().toString(36).slice(-10) + 'A1!';
      const password_hash = await bcrypt.hash(randomPassword, 12);

      const insertResult = await query(
        `INSERT INTO users (full_name, email, password_hash, role, is_email_verified, is_active, profile_photo)
         VALUES ($1, $2, $3, $4, true, true, $5) RETURNING id, full_name, email, role, is_active, is_email_verified`,
        [name, email, password_hash, userRole, picture]
      );
      user = insertResult.rows[0];
    } else {
      user = result.rows[0];
      
      // Since they logged in with Google, we can assume their email is verified
      if (!user.is_email_verified) {
        await query('UPDATE users SET is_email_verified = true, is_active = true WHERE id = $1', [user.id]);
        user.is_email_verified = true;
        user.is_active = true;
      }
      
      if (!user.is_active) {
         return res.status(403).json({ success: false, message: 'Account is disabled by admin' });
      }
    }

    // Generate Tokens
    const access_token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: JWT_ACCESS_EXPIRES });
    const raw_refresh_token = jwt.sign({ id: user.id }, JWT_REFRESH_SECRET, { expiresIn: JWT_REFRESH_EXPIRES });
    const hashed_refresh = await bcrypt.hash(raw_refresh_token, 10);

    await query('UPDATE users SET refresh_token = $1, last_active_at = NOW() WHERE id = $2', [hashed_refresh, user.id]);

    const { password_hash, ...sanitizedUser } = user;
    
    return res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: { access_token, refresh_token: raw_refresh_token, user: sanitizedUser }
    });

  } catch (error) {
    logger.error('Google login error:', error);
    return res.status(401).json({ success: false, message: 'Invalid Google token' });
  }
};

module.exports = {
  googleLogin
};
