const { Pool } = require('pg');
require('dotenv').config();
const { successResponse, errorResponse } = require('../../utils/response');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

exports.getSettings = async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM site_settings');
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    return successResponse(res, settings, 'Settings retrieved successfully', 200);
  } catch (error) {
    console.error('Error fetching settings:', error);
    return errorResponse(res, 'Internal Server Error', 500);
  }
};

exports.updateSettings = async (req, res) => {
  try {
    const { contact_phone, contact_email } = req.body;
    
    // Begin transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      if (contact_phone) {
        await client.query(
          `INSERT INTO site_settings (key, value) VALUES ('contact_phone', $1) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [contact_phone]
        );
      }
      
      if (contact_email) {
        await client.query(
          `INSERT INTO site_settings (key, value) VALUES ('contact_email', $1) 
           ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [contact_email]
        );
      }

      await client.query('COMMIT');
      
      // Fetch updated
      const result = await client.query('SELECT key, value FROM site_settings');
      const settings = {};
      result.rows.forEach(row => {
        settings[row.key] = row.value;
      });
      
      return successResponse(res, settings, 'Settings updated successfully', 200);
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error updating settings:', error);
    return errorResponse(res, 'Internal Server Error', 500);
  }
};
