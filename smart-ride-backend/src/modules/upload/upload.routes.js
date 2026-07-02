const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { verifyToken } = require('../../middleware/auth');
const { successResponse, errorResponse } = require('../../utils/response');
const logger = require('../../utils/logger');

// Configure multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../../../uploads/');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4() + path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix);
  }
});

// File filter for images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload only images.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Endpoint to handle multiple fields of images
router.post('/', verifyToken, upload.fields([
  { name: 'pan_card_image', maxCount: 1 },
  { name: 'license_image', maxCount: 1 },
  { name: 'aadhar_image', maxCount: 1 }
]), (req, res) => {
  try {
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const urls = {};
    
    if (req.files) {
      if (req.files.pan_card_image) {
        urls.pan_card_image = baseUrl + req.files.pan_card_image[0].filename;
      }
      if (req.files.license_image) {
        urls.license_image = baseUrl + req.files.license_image[0].filename;
      }
      if (req.files.aadhar_image) {
        urls.aadhar_image = baseUrl + req.files.aadhar_image[0].filename;
      }
    }
    
    return successResponse(res, urls, 'Files uploaded successfully');
  } catch (error) {
    logger.error(`Upload error: ${error.message}`);
    return errorResponse(res, 'File upload failed', 500);
  }
});

// Endpoint for single image upload (fallback)
router.post('/single', verifyToken, upload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 'No file uploaded', 400);
    }
    const baseUrl = `${req.protocol}://${req.get('host')}/uploads/`;
    const url = baseUrl + req.file.filename;
    return successResponse(res, { url }, 'File uploaded successfully');
  } catch (error) {
    logger.error(`Single upload error: ${error.message}`);
    return errorResponse(res, 'File upload failed', 500);
  }
});

module.exports = router;
