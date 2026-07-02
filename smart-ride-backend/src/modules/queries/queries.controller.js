const { Pool } = require('pg');
require('dotenv').config();
const { successResponse, errorResponse } = require('../../utils/response');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

exports.submitQuery = async (req, res) => {
  try {
    const { name, email, phone, subject, message } = req.body;
    
    if (!name || !email || !message) {
      return errorResponse(res, 'Name, email, and message are required.', 400);
    }

    const result = await pool.query(
      `INSERT INTO contact_queries (name, email, phone, subject, message) 
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [name, email, phone, subject, message]
    );

    return successResponse(res, { id: result.rows[0].id }, 'Query submitted successfully', 201);
  } catch (error) {
    console.error('Error submitting query:', error);
    return errorResponse(res, 'Internal Server Error', 500);
  }
};

exports.getQueries = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM contact_queries ORDER BY created_at DESC'
    );
    return successResponse(res, result.rows, 'Queries retrieved successfully', 200);
  } catch (error) {
    console.error('Error fetching queries:', error);
    return errorResponse(res, 'Internal Server Error', 500);
  }
};

exports.resolveQuery = async (req, res) => {
  try {
    const { id } = req.params;
    const { admin_notes } = req.body;

    const result = await pool.query(
      `UPDATE contact_queries 
       SET status = 'resolved', admin_notes = COALESCE($1, admin_notes), updated_at = NOW() 
       WHERE id = $2 RETURNING *`,
      [admin_notes, id]
    );

    if (result.rows.length === 0) {
      return errorResponse(res, 'Query not found', 404);
    }

    return successResponse(res, result.rows[0], 'Query marked as resolved', 200);
  } catch (error) {
    console.error('Error resolving query:', error);
    return errorResponse(res, 'Internal Server Error', 500);
  }
};
