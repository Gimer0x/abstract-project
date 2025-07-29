const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');

// Rate limiting middleware
const createRateLimiter = (windowMs = 15 * 60 * 1000, max = 100) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      error: 'Too many requests from this IP, please try again later.',
      retryAfter: Math.ceil(windowMs / 1000)
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Specific rate limiters for different endpoints
const authLimiter = createRateLimiter(15 * 60 * 1000, 5); // 5 attempts per 15 minutes
const uploadLimiter = createRateLimiter(60 * 60 * 1000, 10); // 10 uploads per hour
const apiLimiter = createRateLimiter(15 * 60 * 1000, 100); // 100 requests per 15 minutes

// Input validation middleware
const validateDocumentUpload = [
  body('summarySize')
    .optional()
    .isIn(['short', 'medium', 'long'])
    .withMessage('Summary size must be short, medium, or long'),
];

const validateExportRequest = [
  body('summaryData').notEmpty().withMessage('Summary data is required'),
  body('originalFilename').notEmpty().withMessage('Original filename is required'),
  body('summarySize')
    .isIn(['short', 'medium', 'long'])
    .withMessage('Summary size must be short, medium, or long'),
];

// Validation result handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Security headers middleware
const securityHeaders = (req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:;");
  
  next();
};

// File upload security validation
const validateFileUpload = (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  // Check file size (additional validation)
  const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 5 * 1024 * 1024;
  if (req.file.size > maxSize) {
    return res.status(400).json({ 
      error: 'File too large',
      maxSize: maxSize,
      actualSize: req.file.size
    });
  }

  // Additional file type validation
  const allowedTypes = ['.pdf', '.txt', '.docx', '.rtf', '.odt'];
  const fileExtension = req.file.originalname.toLowerCase().split('.').pop();
  
  if (!allowedTypes.includes(`.${fileExtension}`)) {
    return res.status(400).json({ 
      error: 'Invalid file type',
      allowedTypes: allowedTypes,
      receivedType: fileExtension
    });
  }

  next();
};

module.exports = {
  authLimiter,
  uploadLimiter,
  apiLimiter,
  validateDocumentUpload,
  validateExportRequest,
  handleValidationErrors,
  securityHeaders,
  validateFileUpload
}; 