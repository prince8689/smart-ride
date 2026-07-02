const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const { errorResponse } = require('../utils/response');

const imageFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE_IMAGE'), false);
  }
};

const imageOrPdfFilter = (req, file, cb) => {
  if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('INVALID_FILE_TYPE_DOC'), false);
  }
};

// Profile Photo (Images, 5MB, resize 400x400)
const profileStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smartride/profiles',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
    transformation: [{ width: 400, height: 400, crop: 'limit' }, { quality: 'auto' }]
  }
});
const uploadProfilePhoto = multer({ storage: profileStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// License Photo (Images, 10MB)
const licenseStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'smartride/documents/licenses', allowed_formats: ['jpg', 'png', 'webp', 'jpeg'] }
});
const uploadLicensePhoto = multer({ storage: licenseStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Aadhar Photo (Images, 10MB)
const aadharStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'smartride/documents/aadhar', allowed_formats: ['jpg', 'png', 'webp', 'jpeg'] }
});
const uploadAadharPhoto = multer({ storage: aadharStorage, fileFilter: imageFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Vehicle Photo (Images, 5MB, resize 800x600)
const vehicleStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'smartride/vehicles',
    allowed_formats: ['jpg', 'png', 'webp', 'jpeg'],
    transformation: [{ width: 800, height: 600, crop: 'limit' }, { quality: 'auto' }]
  }
});
const uploadVehiclePhoto = multer({ storage: vehicleStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// RC Document (Images + PDF, 10MB)
const rcStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'smartride/documents/rc', allowed_formats: ['jpg', 'png', 'webp', 'jpeg', 'pdf'] }
});
const uploadRCDocument = multer({ storage: rcStorage, fileFilter: imageOrPdfFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Insurance Doc (Images + PDF, 10MB)
const insuranceStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'smartride/documents/insurance', allowed_formats: ['jpg', 'png', 'webp', 'jpeg', 'pdf'] }
});
const uploadInsuranceDoc = multer({ storage: insuranceStorage, fileFilter: imageOrPdfFilter, limits: { fileSize: 10 * 1024 * 1024 } });

// Wrapper to catch multer errors properly
const handleUploadError = (uploadMiddleware) => {
  return (req, res, next) => {
    uploadMiddleware(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_FILE_TYPE_IMAGE') {
          return errorResponse(res, 'Only image files are allowed', 400);
        }
        if (err.message === 'INVALID_FILE_TYPE_DOC') {
          return errorResponse(res, 'Only images and PDF files are allowed', 400);
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return errorResponse(res, 'File size exceeds limit', 400);
        }
        return errorResponse(res, 'File upload error', 400, err.message);
      }
      next();
    });
  };
};

module.exports = {
  uploadProfilePhoto: handleUploadError(uploadProfilePhoto.single('profile_photo')),
  uploadLicensePhoto: handleUploadError(uploadLicensePhoto.single('license_photo')),
  uploadAadharPhoto: handleUploadError(uploadAadharPhoto.single('aadhar_photo')),
  uploadVehiclePhoto: handleUploadError(uploadVehiclePhoto.single('vehicle_photo')),
  uploadRCDocument: handleUploadError(uploadRCDocument.single('rc_document')),
  uploadInsuranceDoc: handleUploadError(uploadInsuranceDoc.single('insurance_document'))
};
